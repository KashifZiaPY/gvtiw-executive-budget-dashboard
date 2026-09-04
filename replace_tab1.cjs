const fs = require('fs');
const content = fs.readFileSync('src/components/AdminHubModule.tsx', 'utf8');

const startIdx = content.indexOf('{/* TAB 1: VOUCHERS & LIFO DELETION OPERATIONS');
const endIdx = content.indexOf('{/* TAB 2: GOOGLE APPS SCRIPT BACKEND & SYNC');

const newTab1 = `{/* TAB 1: VOUCHERS & LIFO DELETION OPERATIONS                     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'vouchers' && (
        <div className="space-y-6">
          
          {/* Primary Operations Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. New Voucher Entry */}
            <div
              className={\`p-5 rounded-2xl border space-y-3 shadow-md flex flex-col justify-between \${
                darkMode ? 'bg-indigo-950/40 border-indigo-500/30 text-white' : 'bg-indigo-50 border-indigo-200 shadow-sm'
              }\`}
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                  <FilePlus className="w-5 h-5" />
                  <span>New Voucher</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  Launch the standardized v3.14 entry dialogue with dynamic calculations.
                </p>
              </div>
              <button
                onClick={() => {
                  setVoucherToAmend(null);
                  setIsNewVoucherModalOpen(true);
                }}
                className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer mt-4"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Voucher Entry</span>
              </button>
            </div>

            {/* 2. Clear Voucher */}
            <div
              className={\`p-5 rounded-2xl border space-y-3 flex flex-col justify-between \${
                darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-white border-slate-300 shadow-sm'
              }\`}
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase">
                  <RotateCcw className="w-5 h-5" />
                  <span>Clear Form</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  Clear the Google Sheet voucher form cells for the next entry.
                </p>
              </div>
              <button
                onClick={() => triggerAppScriptCommand('clearVoucherFormForNextEntry')}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer mt-4"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Clear Voucher Form</span>
              </button>
            </div>

            {/* 3. Amend Voucher */}
            <div
              className={\`p-5 rounded-2xl border space-y-3 flex flex-col justify-between \${
                darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-white border-slate-300 shadow-sm'
              }\`}
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase">
                  <Play className="w-5 h-5" />
                  <span>Amend Voucher</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  Edit an existing voucher by Serial Number.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="number"
                  min="1"
                  value={actionParamSr}
                  onChange={(e) => setActionParamSr(e.target.value)}
                  placeholder="Sr.#"
                  className={\`w-20 px-2 py-2 text-xs rounded-xl border outline-none font-mono font-bold text-center \${
                    darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }\`}
                />
                <button
                  onClick={handleOpenAmendBySr}
                  className="flex-1 py-2 px-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Amend</span>
                </button>
              </div>
            </div>

            {/* 4. Delete Voucher (LIFO) */}
            <div
              className={\`p-5 rounded-2xl border space-y-3 flex flex-col justify-between \${
                darkMode ? 'bg-rose-950/20 border-rose-900/50 text-white' : 'bg-rose-50 border-rose-200 shadow-sm'
              }\`}
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-rose-500 uppercase">
                  <Trash2 className="w-5 h-5" />
                  <span>Delete Voucher</span>
                </div>
                <p className="text-[11px] text-rose-500/80 dark:text-rose-400 mt-2">
                  Strict LIFO Rule: You can only delete the latest generated voucher.
                </p>
              </div>
              <div className="mt-4">
                {latestGeneratedSrNo ? (
                  <button
                    onClick={() => triggerAppScriptCommand('deleteLastVoucherLIFO', { srNo: latestGeneratedSrNo })}
                    className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl flex items-center justify-between shadow-md transition-all cursor-pointer group"
                  >
                    <span>🗑️ Delete Sr. #{latestGeneratedSrNo}</span>
                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 italic">
                    No active vouchers.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Operations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Direct Bank Operations */}
            <div
              className={\`p-5 rounded-2xl border space-y-3 \${
                darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-white border-slate-300 shadow-sm'
              }\`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase">
                <Building className="w-4 h-4" />
                <span>Direct Bank Operations</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Record bank charges, statement reconciliations, and re-post ledgers.
              </p>
              <div className="space-y-2 pt-1 text-xs">
                <button
                  onClick={() => setIsBankChargeModalOpen(true)}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
                >
                  <span>🏦 Record Direct Bank Charge</span>
                  <Building className="w-3.5 h-3.5 text-amber-400" />
                </button>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={actionParamSr}
                    onChange={(e) => setActionParamSr(e.target.value)}
                    placeholder="Sr.#"
                    className={\`w-20 px-2 py-2 text-xs rounded-xl border outline-none font-mono font-bold text-center \${
                      darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }\`}
                  />
                  <button
                    onClick={() => triggerAppScriptCommand('rePostCashbook', { srNo: actionParamSr })}
                    className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
                  >
                    <span>🔄 Re-post to Cashbook (by Sr.#)</span>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sorting & PDF Exports */}
            <div
              className={\`p-5 rounded-2xl border space-y-3 \${
                darkMode ? 'bg-[#0F1D3B] border-slate-700 text-white' : 'bg-white border-slate-300 shadow-sm'
              }\`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase">
                <ArrowUpDown className="w-4 h-4" />
                <span>Sorting & PDF Exports</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sort all 6 institutional cashbooks chronologically and generate 2-page A4 PDFs.
              </p>
              <div className="space-y-2 pt-1 text-xs">
                <button
                  onClick={() => triggerAppScriptCommand('sortCashbookByDate')}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
                >
                  <span>🔀 Sort Cashbooks Chronologically</span>
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                </button>
                
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={actionParamSr}
                    onChange={(e) => setActionParamSr(e.target.value)}
                    placeholder="Sr.#"
                    className={\`w-20 px-2 py-2 text-xs rounded-xl border outline-none font-mono font-bold text-center \${
                      darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }\`}
                  />
                  <button
                    onClick={() => triggerAppScriptCommand('exportVoucherPdf', { srNo: actionParamSr })}
                    className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold rounded-xl flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
                  >
                    <span>🖨️ Export Voucher PDF (Sr. #{actionParamSr})</span>
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      `;

const finalContent = content.substring(0, startIdx - 11) + newTab1 + content.substring(endIdx - 11);
fs.writeFileSync('src/components/AdminHubModule.tsx', finalContent);
