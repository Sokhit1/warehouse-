import { PackagePlus, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { DESTINATION_HUBS } from '../data/initialWarehouseData';
import { Shipment, ShipmentPriority, Truck } from '../types/warehouse';
import { formatWeight, getTruckLoadSummary } from '../utils/warehouseMetrics';

export interface QuickShipmentInput {
  destinationCode: string;
  destinationCity: string;
  weightKg: number;
  pallets: number;
  customer: string;
  cargoDescription: string;
  priority: ShipmentPriority;
  truckId: string | null;
}

interface QuickShipmentModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (input: QuickShipmentInput) => void;
  trucks: Truck[];
  shipments: Shipment[];
}

export function QuickShipmentModal({
  open,
  onClose,
  onSave,
  trucks,
  shipments,
}: QuickShipmentModalProps) {
  const [destinationCode, setDestinationCode] = useState<string>('BOS');
  const [customDestination, setCustomDestination] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('2400');
  const [customer, setCustomer] = useState<string>('');
  const [cargoDescription, setCargoDescription] = useState<string>('');
  const [priority, setPriority] = useState<ShipmentPriority>('Standard');
  const [truckId, setTruckId] = useState<string>('');
  const [error, setError] = useState<string>('');

  const onSiteTrucks = trucks.filter((t) => t.inWarehouse);

  useEffect(() => {
    if (!open) return;
    setDestinationCode('BOS');
    setCustomDestination('');
    setWeightKg('2400');
    setCustomer('');
    setCargoDescription('');
    setPriority('Standard');
    setTruckId('');
    setError('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedWeight = Number(weightKg);

    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0 || parsedWeight > 50000) {
      setError('Enter a valid cargo weight between 1 and 50,000 kg.');
      return;
    }

    let resolvedCode = destinationCode;
    let resolvedCity: string =
      DESTINATION_HUBS.find((h) => h.code === destinationCode)?.city ?? destinationCode;

    if (destinationCode === 'CUSTOM') {
      const cleaned = customDestination.trim().slice(0, 80);
      if (cleaned.length < 2) {
        setError('Enter a destination city or hub name (at least 2 characters).');
        return;
      }
      resolvedCity = cleaned;
      const alnum = cleaned.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
      resolvedCode = alnum.length >= 2 ? alnum : 'HUB';
    }

    const estimatedPallets = Math.min(100, Math.max(1, Math.round(parsedWeight / 650)));

    onSave({
      destinationCode: resolvedCode,
      destinationCity: resolvedCity.slice(0, 80),
      weightKg: Math.round(parsedWeight),
      pallets: estimatedPallets,
      customer: (customer.trim() || `${resolvedCity.split(',')[0]} Distribution Partner`).slice(0, 100),
      cargoDescription: (cargoDescription.trim() || 'Palletized outbound commercial freight').slice(0, 160),
      priority,
      truckId: truckId || null,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-shipment-title"
    >
      <div
        className="fixed inset-0 bg-[#101915]/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[480px] overflow-hidden rounded-xl border border-[#DCE2DF] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5EAE7] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ECF5F0] text-[#145338]">
              <PackagePlus className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="quick-shipment-title"
                className="font-display text-[15.5px] font-semibold text-[#111916]"
              >
                Quick shipment
              </h2>
              <p className="text-[12px] text-[#66756E]">
                Log outbound freight or assign directly to an on-site truck.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick shipment modal"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5B6A63] hover:bg-[#F3F5F4] hover:text-[#111916]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700"
            >
              {error}
            </div>
          )}

          {/* Destination */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="qs-destination"
                className="mb-1.5 block text-[12.5px] font-medium text-[#324039]"
              >
                Destination <span className="text-[#145338]">*</span>
              </label>
              <select
                id="qs-destination"
                value={destinationCode}
                onChange={(e) => {
                  setDestinationCode(e.target.value);
                  setError('');
                }}
                className="h-9.5 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-[13px] text-[#141C18] focus:border-[#145338] focus:outline-none"
              >
                {DESTINATION_HUBS.map((hub) => (
                  <option key={hub.code} value={hub.code}>
                    NY → {hub.code} ({hub.city})
                  </option>
                ))}
                <option value="CUSTOM">Custom destination...</option>
              </select>
            </div>

            {/* Cargo Weight */}
            <div>
              <label
                htmlFor="qs-weight"
                className="mb-1.5 block text-[12.5px] font-medium text-[#324039]"
              >
                Cargo weight (kg) <span className="text-[#145338]">*</span>
              </label>
              <input
                id="qs-weight"
                type="number"
                min={50}
                max={25000}
                step={10}
                required
                value={weightKg}
                onChange={(e) => {
                  setWeightKg(e.target.value);
                  setError('');
                }}
                placeholder="e.g. 2400"
                className="h-9.5 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 font-mono text-[13px] text-[#141C18] tabular-nums focus:border-[#145338] focus:outline-none"
              />
            </div>
          </div>

          {destinationCode === 'CUSTOM' && (
            <div>
              <label
                htmlFor="qs-custom-dest"
                className="mb-1.5 block text-[12.5px] font-medium text-[#324039]"
              >
                Custom destination city
              </label>
              <input
                id="qs-custom-dest"
                type="text"
                value={customDestination}
                onChange={(e) => {
                  setCustomDestination(e.target.value);
                  setError('');
                }}
                placeholder="e.g. Albany, NY"
                className="h-9.5 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-[13px] text-[#141C18] focus:border-[#145338] focus:outline-none"
              />
            </div>
          )}

          {/* Optional Truck Assignment */}
          <div>
            <label
              htmlFor="qs-truck"
              className="mb-1.5 block text-[12.5px] font-medium text-[#324039]"
            >
              Truck assignment{' '}
              <span className="font-normal text-[#6E7D76]">(optional)</span>
            </label>
            <select
              id="qs-truck"
              value={truckId}
              onChange={(e) => setTruckId(e.target.value)}
              className="h-9.5 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-[13px] text-[#141C18] focus:border-[#145338] focus:outline-none"
            >
              <option value="">Leave unassigned (add to pending queue)</option>
              {onSiteTrucks.map((t) => {
                const summary = getTruckLoadSummary(t, shipments);
                return (
                  <option key={t.id} value={t.id}>
                    {t.id} · Dock #{t.dockNumber} · {t.originCode}→{t.destinationCode} (
                    {formatWeight(summary.plannedWeightKg)} / {formatWeight(t.maxCapacityKg)})
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-[11.5px] text-[#6B7A73]">
              {truckId
                ? 'Cargo will be staged on the selected truck manifest immediately.'
                : 'Unassigned shipments immediately update the overview pending count.'}
            </p>
          </div>

          {/* Optional Customer & Cargo Notes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="qs-customer"
                className="mb-1.5 block text-[12.5px] font-medium text-[#324039]"
              >
                Consignee / Customer
              </label>
              <input
                id="qs-customer"
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="e.g. Harborview Retail"
                className="h-9.5 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-[13px] text-[#141C18] focus:border-[#145338] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="qs-priority"
                className="mb-1.5 block text-[12.5px] font-medium text-[#324039]"
              >
                Priority
              </label>
              <select
                id="qs-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as ShipmentPriority)}
                className="h-9.5 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-[13px] text-[#141C18] focus:border-[#145338] focus:outline-none"
              >
                <option value="Standard">Standard</option>
                <option value="Priority">Priority</option>
                <option value="Express">Express</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="qs-cargo"
              className="mb-1.5 block text-[12.5px] font-medium text-[#324039]"
            >
              Cargo notes
            </label>
            <input
              id="qs-cargo"
              type="text"
              value={cargoDescription}
              onChange={(e) => setCargoDescription(e.target.value)}
              placeholder="e.g. Palletized medical diagnostics, keep dry"
              className="h-9.5 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-[13px] text-[#141C18] focus:border-[#145338] focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-[#EDF1EF] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-[#DCE2DF] bg-white px-4 text-[13px] font-medium text-[#324039] hover:bg-[#F7F9F8] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 rounded-lg bg-[#145338] px-4 text-[13px] font-semibold text-white hover:bg-[#0E3E29] transition-colors"
            >
              Save shipment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
