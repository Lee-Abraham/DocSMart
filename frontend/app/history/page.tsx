type HistoryItem = {
  id: number;
  documentName: string;
  action: string;
  date: string;
};

async function getHistory(): Promise<HistoryItem[]> {
  const res = await fetch("http://localhost:5000/history", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch history");
  }

  return res.json();
}

export default async function HistoryPage() {
  const history = await getHistory();

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">History</h1>

      {history.length === 0 ? (
        <p className="text-gray-500">No history found.</p>
      ) : (
        <ul className="space-y-3">
          {history.map((item) => (
            <li
              key={item.id}
              className="border rounded-md p-4 flex justify-between"
            >
              <div>
                <p className="font-medium">{item.documentName}</p>
                <p className="text-sm text-gray-500">{item.action}</p>
              </div>

              <span className="text-sm text-gray-400">
                {item.date}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}