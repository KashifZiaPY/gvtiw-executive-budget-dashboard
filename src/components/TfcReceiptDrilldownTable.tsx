import React from 'react';
import {
  TfcChallanRecord,
  computeChallanFeeBreakdown,
  ChallanFeeBreakdown,
} from '../data/tfcChallanData';
import { formatPKR } from '../lib/formatters';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface TfcReceiptDrilldownTableProps {
  rowKey: string;
  rowLabel: string;
  challans: TfcChallanRecord[];
  breakdown: ChallanFeeBreakdown;
  darkMode: boolean;
  onScrollDrilldown: (key: string, delta: number) => void;
}

export const TfcReceiptDrilldownTable: React.FC<TfcReceiptDrilldownTableProps> = ({
  rowKey,
  rowLabel,
  challans,
  breakdown,
  darkMode,
  onScrollDrilldown,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
      {/* Drilldown Toolbar with Quick Scroll Buttons */}
      <div className="bg-slate-100 dark:bg-slate-800 px-3.5 py-2 text-xs font-bold flex flex-wrap items-center justify-between gap-2 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-slate-900 dark:text-white">
            Challan Drilldown for {rowLabel}
          </span>
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-full font-bold text-[10px]">
            {challans.length} Students
          </span>
        </div>
        <div className="text-[11px] font-medium text-slate-500 flex items-center gap-3">
          <span>
            Total: <strong className="text-blue-600 dark:text-cyan-400">Rs. {formatPKR(breakdown.totalAmountReceived)}</strong>
          </span>
          <span>
            TEVTA: <strong className="text-rose-600">Rs. {formatPKR(breakdown.totalTevtaDues)}</strong>
          </span>
          <span>
            Inst. Share: <strong className="text-emerald-600">Rs. {formatPKR(breakdown.instituteShare)}</strong>
          </span>
        </div>
        {/* Drilldown Horizontal Navigation Stepper */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] text-slate-500 font-semibold hidden md:inline">Scroll Detail:</span>
          <button
            type="button"
            onClick={() => onScrollDrilldown(rowKey, -240)}
            className="p-1 rounded bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 cursor-pointer shadow-2xs"
            title="Scroll detail table left"
          >
            <ArrowLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onScrollDrilldown(rowKey, 240)}
            className="p-1 rounded bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 cursor-pointer shadow-2xs"
            title="Scroll detail table right"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Drilldown Table with Frozen Headers, Frozen ID & Name columns, and Frozen Totals */}
      <div
        id={`drilldown-container-${rowKey}`}
        className="overflow-x-auto overflow-y-auto max-h-96 relative border-t border-slate-200 dark:border-slate-800 scrollbar-thin scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-600 scrollbar-track-slate-100 dark:scrollbar-track-slate-900"
      >
        <table className="w-full text-[11px] text-left border-separate border-spacing-0">
          <thead className="sticky top-0 z-30 shadow-xs">
            <tr className="bg-slate-200 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 text-[11px]">
              <th className="py-2.5 px-2.5 sticky left-0 top-0 z-40 bg-slate-200 dark:bg-slate-800 w-[115px] min-w-[115px] max-w-[115px] border-b-2 border-r border-slate-300 dark:border-slate-700 font-black">
                Challan ID
              </th>
              <th className="py-2.5 px-2.5 sticky left-[115px] top-0 z-40 bg-slate-200 dark:bg-slate-800 min-w-[180px] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.12)] border-b-2 border-r border-slate-300 dark:border-slate-700 font-black">
                Roll / Trainee Name
              </th>
              <th className="py-2.5 px-2 sticky top-0 z-20 bg-slate-200 dark:bg-slate-800 min-w-[85px] border-b-2 border-r border-slate-300 dark:border-slate-700">
                Course
              </th>
              <th className="py-2.5 px-2 text-right sticky top-0 z-20 bg-slate-200 dark:bg-slate-800 min-w-[75px] border-b-2 border-r border-slate-300 dark:border-slate-700">
                Adm Fee
              </th>
              <th className="py-2.5 px-2 text-right sticky top-0 z-20 bg-slate-200 dark:bg-slate-800 min-w-[75px] border-b-2 border-r border-slate-300 dark:border-slate-700">
                25% PF
              </th>
              <th className="py-2.5 px-2 text-right font-bold text-rose-600 sticky top-0 z-20 bg-slate-200 dark:bg-slate-800 min-w-[90px] border-b-2 border-r border-slate-300 dark:border-slate-700">
                TEVTA Dues
              </th>
              <th className="py-2.5 px-2 text-right sticky top-0 z-20 bg-slate-200 dark:bg-slate-800 min-w-[75px] border-b-2 border-r border-slate-300 dark:border-slate-700">
                75% PF
              </th>
              <th className="py-2.5 px-2 text-right sticky top-0 z-20 bg-slate-200 dark:bg-slate-800 min-w-[75px] border-b-2 border-r border-slate-300 dark:border-slate-700">
                Security
              </th>
              <th className="py-2.5 px-2 text-right font-bold text-amber-600 sticky top-0 z-20 bg-slate-200 dark:bg-slate-800 min-w-[90px] border-b-2 border-r border-slate-300 dark:border-slate-700">
                Board Fee
              </th>
              <th className="py-2.5 px-2 text-right font-bold text-purple-600 sticky top-0 z-20 bg-slate-200 dark:bg-slate-800 min-w-[85px] border-b-2 border-r border-slate-300 dark:border-slate-700">
                Self Fin.
              </th>
              <th className="py-2.5 px-2 text-right font-bold text-indigo-600 sticky top-0 z-20 bg-slate-200 dark:bg-slate-800 min-w-[80px] border-b-2 border-r border-slate-300 dark:border-slate-700">
                Other (TUV)
              </th>
              <th className="py-2.5 px-2 text-right font-bold text-emerald-600 sticky top-0 z-20 bg-slate-200 dark:bg-slate-800 min-w-[95px] border-b-2 border-r border-slate-300 dark:border-slate-700">
                Institute Share
              </th>
              <th className="py-2.5 px-2.5 text-right font-black text-blue-700 dark:text-cyan-400 sticky top-0 z-20 bg-slate-200 dark:bg-slate-800 min-w-[100px] border-b-2 border-slate-300 dark:border-slate-700">
                Total (Rs.)
              </th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {challans.map((c, sIdx) => {
              const cb = computeChallanFeeBreakdown(c);
              const subRowBg = sIdx % 2 === 1
                ? darkMode ? 'bg-slate-900/90' : 'bg-slate-50/80'
                : darkMode ? 'bg-slate-900' : 'bg-white';
              return (
                <tr key={c.challanId} className="hover:bg-amber-50/50 dark:hover:bg-slate-800/60 transition-colors">
                  <td className={`py-1.5 px-2.5 font-bold text-slate-700 dark:text-slate-300 sticky left-0 z-10 ${subRowBg} w-[115px] min-w-[115px] max-w-[115px] border-r border-b border-slate-200 dark:border-slate-800`}>
                    {c.challanId}
                  </td>
                  <td className={`py-1.5 px-2.5 font-sans sticky left-[115px] z-10 ${subRowBg} shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)] min-w-[180px] border-r border-b border-slate-200 dark:border-slate-800`}>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {c.traineeName}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                      {c.rollOrCode && <span>{c.rollOrCode}</span>}
                      {c.cnic && <span>• CNIC: {c.cnic}</span>}
                    </div>
                  </td>
                  <td className="py-1.5 px-2 font-sans font-semibold border-r border-b border-slate-200 dark:border-slate-800">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        cb.isBeauticianSelfFinance
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                          : cb.isTuv
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {c.courseAbbreviation || 'REG'}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right text-slate-600 dark:text-slate-400 border-r border-b border-slate-200 dark:border-slate-800">
                    {cb.admissionTuitionRegFee > 0 ? formatPKR(cb.admissionTuitionRegFee) : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right text-slate-600 dark:text-slate-400 border-r border-b border-slate-200 dark:border-slate-800">
                    {cb.pupilFee25Percent > 0 ? formatPKR(cb.pupilFee25Percent) : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold text-rose-600 border-r border-b border-slate-200 dark:border-slate-800">
                    {formatPKR(cb.totalTevtaDues)}
                  </td>
                  <td className="py-1.5 px-2 text-right text-slate-600 dark:text-slate-400 border-r border-b border-slate-200 dark:border-slate-800">
                    {cb.pupilFee75Percent > 0 ? formatPKR(cb.pupilFee75Percent) : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right text-slate-600 dark:text-slate-400 border-r border-b border-slate-200 dark:border-slate-800">
                    {cb.collegeSecurity > 0 ? formatPKR(cb.collegeSecurity) : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold text-amber-600 border-r border-b border-slate-200 dark:border-slate-800">
                    {cb.boardCharges > 0 ? formatPKR(cb.boardCharges) : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold text-purple-600 border-r border-slate-200 dark:border-slate-800">
                    {cb.shortCourseSelfFinance > 0 ? formatPKR(cb.shortCourseSelfFinance) : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold text-indigo-600 border-r border-slate-200 dark:border-slate-800">
                    {cb.bankProfit > 0 ? formatPKR(cb.bankProfit) : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold text-emerald-600 border-r border-slate-200 dark:border-slate-800">
                    {formatPKR(cb.instituteShare)}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-black text-blue-700 dark:text-cyan-400 border-b border-slate-200 dark:border-slate-800">
                    {formatPKR(cb.totalAmountReceived)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-200 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700">
              <td className="py-2 px-2.5 sticky left-0 bottom-0 z-30 bg-slate-200 dark:bg-slate-800 w-[115px] min-w-[115px] max-w-[115px] border-t-2 border-r border-slate-300 dark:border-slate-700"></td>
              <td className="py-2 px-2.5 sticky left-[115px] bottom-0 z-30 bg-slate-200 dark:bg-slate-800 min-w-[180px] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.12)] border-t-2 border-r border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                Total for {rowLabel}
              </td>
              <td className="py-2 px-2 border-t-2 border-r border-slate-300 dark:border-slate-700 text-slate-500 font-normal">
                {challans.length} Challans
              </td>
              <td className="py-2 px-2 text-right font-mono border-t-2 border-r border-slate-300 dark:border-slate-700">
                {breakdown.admissionTuitionRegFee > 0 ? formatPKR(breakdown.admissionTuitionRegFee) : '-'}
              </td>
              <td className="py-2 px-2 text-right font-mono border-t-2 border-r border-slate-300 dark:border-slate-700">
                {breakdown.pupilFee25Percent > 0 ? formatPKR(breakdown.pupilFee25Percent) : '-'}
              </td>
              <td className="py-2 px-2 text-right font-bold text-rose-600 font-mono border-t-2 border-r border-slate-300 dark:border-slate-700">
                {formatPKR(breakdown.totalTevtaDues)}
              </td>
              <td className="py-2 px-2 text-right font-mono border-t-2 border-r border-slate-300 dark:border-slate-700">
                {breakdown.pupilFee75Percent > 0 ? formatPKR(breakdown.pupilFee75Percent) : '-'}
              </td>
              <td className="py-2 px-2 text-right font-mono border-t-2 border-r border-slate-300 dark:border-slate-700">
                {breakdown.collegeSecurity > 0 ? formatPKR(breakdown.collegeSecurity) : '-'}
              </td>
              <td className="py-2 px-2 text-right font-bold text-amber-600 font-mono border-t-2 border-r border-slate-300 dark:border-slate-700">
                {breakdown.boardCharges > 0 ? formatPKR(breakdown.boardCharges) : '-'}
              </td>
              <td className="py-2 px-2 text-right font-bold text-purple-600 font-mono border-t-2 border-r border-slate-300 dark:border-slate-700">
                {breakdown.shortCourseSelfFinance > 0 ? formatPKR(breakdown.shortCourseSelfFinance) : '-'}
              </td>
              <td className="py-2 px-2 text-right text-indigo-600 font-mono border-t-2 border-r border-slate-300 dark:border-slate-700">
                {breakdown.bankProfit > 0 ? formatPKR(breakdown.bankProfit) : '-'}
              </td>
              <td className="py-2 px-2 text-right text-emerald-600 font-black font-mono border-t-2 border-r border-slate-300 dark:border-slate-700">
                {formatPKR(breakdown.instituteShare)}
              </td>
              <td className="py-2 px-2.5 text-right text-blue-700 dark:text-cyan-400 font-black font-mono border-t-2 border-slate-300 dark:border-slate-700">
                Rs. {formatPKR(breakdown.totalAmountReceived)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
