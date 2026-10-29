export function ComingSoon({ title }: { title: string }) {
  return (
    <section className="page">
      <h1>{title}</h1>
      <p className="muted">
        This screen is being rebuilt. Use the current Gecko app for it in the meantime.
      </p>
    </section>
  );
}
