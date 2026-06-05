export default function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f0f2f5",
        color: "#0f172a",
        fontFamily: "inherit",
      }}
    >
      {children}
    </div>
  );
}
