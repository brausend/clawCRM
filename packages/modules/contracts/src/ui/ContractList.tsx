/**
 * Contract list view for the ClawCRM dashboard.
 * This component is lazy-loaded by the ModuleRenderer.
 */

interface Contract {
  id: string;
  provider: string;
  contractType: string;
  status: string;
  monthlyAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export default function ContractList({ contracts = [] }: { contracts?: Contract[] }) {
  if (contracts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No contracts yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contracts.map((contract) => (
        <div
          key={contract.id}
          className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                {contract.provider}
              </h4>
              <p className="text-sm text-gray-500">{contract.contractType}</p>
            </div>
            <div className="text-right">
              {contract.monthlyAmount && (
                <p className="font-semibold text-gray-900 dark:text-white">
                  {contract.monthlyAmount.toFixed(2)} EUR/Monat
                </p>
              )}
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  contract.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {contract.status}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
