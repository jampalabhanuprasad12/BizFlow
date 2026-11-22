import { Card } from "../ui/index.js";

export function ChartCard({ title, description, children, action }) {
  return (
    <Card title={title} description={description} action={action}>
      <div className="h-72 min-w-0">{children}</div>
    </Card>
  );
}
