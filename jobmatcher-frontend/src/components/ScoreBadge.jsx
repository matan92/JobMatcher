export default function ScoreBadge({ value }) {
  let color = "bg-gray-400 text-white";

  if (value >= 80) color = "bg-green-600 text-white";
  else if (value >= 60) color = "bg-yellow-500 text-white";
  else color = "bg-red-500 text-white";

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
      {value.toFixed(1)}%
    </span>
  );
}
