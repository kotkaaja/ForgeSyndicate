// pages/Catalog.tsx

const [filter, setFilter] = useState<'all' | 'official' | 'verified' | 'unofficial'>('all');

const officialMods = mods.filter(m => m.approval_status === 'official');
const verifiedMods = mods.filter(m => m.approval_status === 'verified');
const unofficialMods = mods.filter(m => m.approval_status === 'unofficial');

return (
  <div>
    {/* Filter Tabs */}
    <div className="flex gap-2 mb-6">
      <button 
        onClick={() => setFilter('all')}
        className={filter === 'all' ? 'active' : ''}
      >
        Semua ({mods.length})
      </button>
      <button 
        onClick={() => setFilter('official')}
        className={filter === 'official' ? 'active' : ''}
      >
        ⭐ Official ({officialMods.length})
      </button>
      <button 
        onClick={() => setFilter('verified')}
        className={filter === 'verified' ? 'active' : ''}
      >
        ✅ Verified ({verifiedMods.length})
      </button>
      <button 
        onClick={() => setFilter('unofficial')}
        className={filter === 'unofficial' ? 'active' : ''}
      >
        Unofficial ({unofficialMods.length})
      </button>
    </div>

    {/* Official Section (Always visible & highlighted) */}
    {(filter === 'all' || filter === 'official') && officialMods.length > 0 && (
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 px-4 py-2 rounded-xl border border-yellow-500/40">
            <Crown size={16} className="text-yellow-400"/>
            <h2 className="text-yellow-400 font-black uppercase tracking-wider">
              Mod Official
            </h2>
          </div>
          <p className="text-zinc-500 text-sm">Diverifikasi & Dijamin Aman</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {officialMods.map(mod => (
            <ModCard 
              key={mod.id} 
              mod={mod} 
              highlighted={true}
              badgeStyle="official"
            />
          ))}
        </div>
      </div>
    )}

    {/* Verified Section */}
    {(filter === 'all' || filter === 'verified') && verifiedMods.length > 0 && (
      <div className="mb-12">
        <h2 className="text-blue-400 font-bold mb-4">✅ Mod Verified</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {verifiedMods.map(mod => (
            <ModCard key={mod.id} mod={mod} badgeStyle="verified"/>
          ))}
        </div>
      </div>
    )}

    {/* Unofficial Section */}
    {(filter === 'all' || filter === 'unofficial') && unofficialMods.length > 0 && (
      <div>
        <h2 className="text-zinc-400 font-bold mb-4">Mod Unofficial</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unofficialMods.map(mod => (
            <ModCard key={mod.id} mod={mod} badgeStyle="unofficial"/>
          ))}
        </div>
      </div>
    )}
  </div>
);