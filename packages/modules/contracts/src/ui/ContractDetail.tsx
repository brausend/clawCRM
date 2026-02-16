/**
 * Contract detail view for the ClawCRM dashboard.
 */

interface Contract {
  id: string;
  provider: string;
  contractType: string;
  status: string;
  monthlyAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
}

export default function ContractDetail({ contract }: { contract?: Contract }) {
  if (!contract) {
    return <div className="text-gray-500">Kein Vertrag ausgewaehlt.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {contract.provider}
        </h3>
        <p className="text-gray-500 mt-1">{contract.contractType}</p>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <InfoField label="Status" value={contract.status} />
          <InfoField
            label="Monatlich"
            value={
              contract.monthlyAmount
                ? `${contract.monthlyAmount.toFixed(2)} EUR`
                : "–"
            }
          />
          <InfoField label="Beginn" value={contract.startDate ?? "–"} />
          <InfoField label="Ende" value={contract.endDate ?? "–"} />
        </div>

        {contract.notes && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Notizen</p>
            <p className="text-sm text-gray-900 dark:text-white mt-1">
              {contract.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-sm text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
