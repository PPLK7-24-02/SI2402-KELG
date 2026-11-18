import { CheckCircle, Clock } from "../../components/icons";

type Props = {
  status: string;
};

export default function EdukasiStatusBadge({ status }: Props) {
  const published = status === "PUBLISHED";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        published
          ? "bg-[#ecfdf3] text-[#16a34a]"
          : "bg-[#f1f5f9] text-[#64748b]"
      }`}
    >
      {published ? <CheckCircle size={13} /> : <Clock size={13} />}
      {published ? "Dipublikasikan" : status === "DRAFT" ? "Draft" : status}
    </span>
  );
}
