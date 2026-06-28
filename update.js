const fs = require('fs');
let content = fs.readFileSync('src/pages/RTOMTeleshopAnalytics.tsx', 'utf8');

content = content.replace(
  'const [selectedOutlet, setSelectedOutlet] = useState<string>(\'\')',
  'const [selectedOutlets, setSelectedOutlets] = useState<string[]>([])\n  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false)'
);

content = content.replace(
  /useEffect\(\(\) => \{\s*if \(selectedOutlet\) \{\s*fetchAnalytics\(\)\s*\}\s*\}, \[selectedOutlet, startDate, endDate\]\)/,
  'useEffect(() => {\n    if (outlets.length > 0) {\n      fetchAnalytics()\n    }\n  }, [selectedOutlets, outlets, startDate, endDate])'
);

content = content.replace(
  /if \(outletsData\.length > 0\) \{\s*setSelectedOutlet\(outletsData\[0\]\.id\)\s*\}/,
  'if (outletsData.length > 0) {\n        setSelectedOutlets(outletsData.map((o: any) => o.id))\n      }'
);

content = content.replace(
  /const response = await api\.get\(\\/manager\/outlet\/\$\{selectedOutlet\}\/analytics\\, \{/,
  'const response = await api.get(/manager/outlets/analytics, {\n        params: {\n          outletIds: selectedOutlets.length > 0 ? selectedOutlets.join(\',\') : outlets.map((o: any) => o.id).join(\',\'),'
);

content = content.replace(
  /const selectedOutletData = outlets\.find\(o => o\.id === selectedOutlet\)/,
  'const selectedOutletData = selectedOutlets.length === 1 ? outlets.find(o => o.id === selectedOutlets[0]) : { name: selectedOutlets.length === 0 ? "All Assigned Outlets" : \\ Outlets Selected\, address: "Multiple Locations", teleshopManagerName: "Multiple Managers" }'
);

const dropdown = \            <div className="relative min-w-[250px]">
              <div
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white cursor-pointer min-h-[42px] flex items-center justify-between"
                onClick={() => setIsScopeDropdownOpen(!isScopeDropdownOpen)}
              >
                <span className="truncate pr-2">
                  {selectedOutlets.length === 0 ? "All Assigned Outlets" : \\ Outlet\ Selected\}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </div>
              
              {isScopeDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto z-50">
                  <div
                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 text-sm font-medium text-slate-700"
                    onClick={() => {
                      setSelectedOutlets([])
                      setIsScopeDropdownOpen(false)
                    }}
                  >
                    All Assigned Outlets
                  </div>
                  {outlets.map(outlet => (
                    <label key={outlet.id} className="flex items-center px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedOutlets.includes(outlet.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOutlets([...selectedOutlets, outlet.id])
                          } else {
                            setSelectedOutlets(selectedOutlets.filter(id => id !== outlet.id))
                          }
                        }}
                        className="mr-3 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                      />
                      <span className="truncate">{outlet.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>\;

content = content.replace(
  /<div className="relative">\s*<select\s*value=\{selectedOutlet\}\s*onChange=\{\(e\) => setSelectedOutlet\(e\.target\.value\)\}[^<]+(?:<option key=\{outlet\.id\} value=\{outlet\.id\}>\s*\{outlet\.name\}\s*<\/option>\s*)+<\/select>\s*<ChevronDown className="absolute right-2 top-1\/2 transform -translate-y-1\/2 w-5 h-5 text-gray-400 pointer-events-none" \/>\s*<\/div>/g,
  dropdown
);

fs.writeFileSync('src/pages/RTOMTeleshopAnalytics.tsx', content);
console.log('Update successful');
