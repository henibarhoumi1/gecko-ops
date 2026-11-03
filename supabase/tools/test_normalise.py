"""Unit tests for normalise.py. Run with: python3 -m unittest discover -s supabase/tools -p 'test_*.py'"""

import unittest

import normalise as n

F, R = n.FIELD, n.RECORD


def raw(*rows):
    return "\n".join(F.join(r) + R for r in rows) + "\n"


class ParseTests(unittest.TestCase):
    def test_collapses_whitespace_and_keeps_line_breaks_in_sources(self):
        listing = n.parse_raw(raw(
            ("constraint", "public.t.c", "c  CHECK\n (x > 0)"),
            ("source", "function public.f()", "CREATE FUNCTION\n\tbody"),
        ))
        self.assertEqual(listing[("constraint", "public.t.c")], "c CHECK (x > 0)")
        self.assertEqual(listing[("source", "function public.f()")], "CREATE FUNCTION\\n\\tbody")

    def test_rejects_malformed_records(self):
        with self.assertRaises(ValueError):
            n.parse_raw("only" + F + "two" + R)

    def test_tsv_round_trip_is_sorted(self):
        listing = n.parse_raw(raw(("table", "public.b", "x"), ("table", "public.a", "y")))
        tsv = n.to_tsv(listing)
        self.assertEqual(tsv.splitlines()[0], "table\tpublic.a\ty")
        self.assertEqual(n.read_tsv(tsv), listing)


class CompareTests(unittest.TestCase):
    expected = {
        ("fact", "server_version_major"): "15",
        ("table", "public.clients"): "kind=r rls=true forced=false",
        ("function", "public.f()"): "body=aaa",
        ("source", "function public.f()"): "repo body",
        ("policy", "public.clients.p"): "permissive",
    }
    live = {
        ("fact", "server_version_major"): "17",
        ("fact", "history"): "none",
        ("table", "public.clients"): "kind=r rls=true forced=false",
        ("function", "public.f()"): "body=bbb",
        ("source", "function public.f()"): "live body with a secret",
        ("function", "public.hand_made()"): "body=ccc",
    }

    def test_three_lists_and_facts_are_not_compared(self):
        _, _, only_repo, only_live, different = n.compare(self.expected, self.live)
        self.assertEqual(only_repo, [("policy", "public.clients.p")])
        self.assertEqual(only_live, [("function", "public.hand_made()")])
        self.assertEqual(different, [("function", "public.f()")])

    def test_public_summary_never_contains_definitions(self):
        summary = n.render_summary(self.expected, self.live)
        self.assertNotIn("secret", summary)
        self.assertNotIn("body=bbb", summary)
        self.assertIn("public.hand_made()", summary)
        self.assertIn("different: rebuild expected", summary)
        self.assertIn("no migration history table", summary)

    def test_full_report_has_both_definitions(self):
        full = n.render_full(self.expected, self.live)
        self.assertIn("live body with a secret", full)
        self.assertIn("repo body", full)

    def test_identical_listings_have_no_differences(self):
        _, _, a, b, c = n.compare(self.expected, dict(self.expected))
        self.assertEqual((a, b, c), ([], [], []))


if __name__ == "__main__":
    unittest.main()
