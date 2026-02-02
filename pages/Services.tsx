import React from 'react';
import { getServices } from '../services/data';
import { DollarSign, MessageCircle } from 'lucide-react';

const Services: React.FC = () => {
  const services = getServices();

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 min-h-screen bg-[#0f0f0f]">
      {/* Header */}
      <div className="text-center mb-16 pt-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-heading">
            Jasa Scripting & <span className="text-green-600">Development</span>
        </h1>
        <div className="h-1 w-24 bg-green-600 mx-auto mb-6 rounded-full"></div>
        <p className="text-zinc-400 max-w-2xl mx-auto text-lg leading-relaxed">
          Butuh fitur custom untuk server SAMP, Client, atau Bot Automation? 
          Tim kami siap merealisasikan ide "gila" kamu menjadi program yang fungsional.
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
        {services.map(service => (
          <div key={service.id} className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden flex flex-col md:flex-row hover:border-green-600 hover:shadow-[0_0_20px_rgba(22,163,74,0.15)] transition-all group">
            {/* Image Section */}
            <div className="w-full md:w-2/5 h-56 md:h-auto relative overflow-hidden">
               <img 
                 src={service.imageUrl} 
                 alt={service.title} 
                 className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
               />
               <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#1a1a1a] via-transparent to-transparent"></div>
            </div>
            
            {/* Content Section */}
            <div className="p-6 md:w-3/5 flex flex-col justify-center">
              <h3 className="text-2xl font-bold text-white mb-2 leading-tight">{service.title}</h3>
              <p className="text-zinc-400 mb-6 text-sm leading-relaxed">{service.description}</p>
              
              <div className="mt-auto">
                  <div className="flex items-center text-green-500 font-bold text-lg mb-4">
                    <DollarSign size={20} className="mr-1" />
                    Mulai dari {service.priceStart}
                  </div>
                  <a 
                    href="https://discord.gg/X2UW7VRqnB" 
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block w-full text-center bg-zinc-800 hover:bg-green-700 hover:text-white text-zinc-300 py-3 rounded border border-zinc-700 hover:border-green-600 font-bold uppercase tracking-wider transition-all"
                  >
                    Order Sekarang
                  </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Workflow Section */}
      <div className="bg-[#1a1a1a] border border-zinc-800 p-8 md:p-12 rounded-xl relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-green-900/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-green-900/10 rounded-full blur-3xl"></div>

        <h2 className="text-2xl font-bold text-white mb-10 text-center uppercase tracking-widest">Alur Pemesanan</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <div className="text-center group">
            <div className="w-16 h-16 bg-zinc-900 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-900 group-hover:border-green-500 group-hover:bg-green-900/20 transition-all font-bold text-2xl shadow-lg">1</div>
            <h4 className="font-bold text-white text-lg mb-2">Konsultasi</h4>
            <p className="text-zinc-500 text-sm px-4">Diskusikan ide, fitur, dan budget via Discord Ticket.</p>
          </div>
          
          <div className="text-center group">
            <div className="w-16 h-16 bg-zinc-900 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-900 group-hover:border-green-500 group-hover:bg-green-900/20 transition-all font-bold text-2xl shadow-lg">2</div>
            <h4 className="font-bold text-white text-lg mb-2">Development</h4>
            <p className="text-zinc-500 text-sm px-4">Pengerjaan dimulai setelah DP 50%. Update progress realtime.</p>
          </div>
          
          <div className="text-center group">
            <div className="w-16 h-16 bg-zinc-900 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-900 group-hover:border-green-500 group-hover:bg-green-900/20 transition-all font-bold text-2xl shadow-lg">3</div>
            <h4 className="font-bold text-white text-lg mb-2">Delivery</h4>
            <p className="text-zinc-500 text-sm px-4">Testing final, pelunasan, dan penyerahan file script/bot.</p>
          </div>
        </div>
        
        <div className="text-center mt-12">
          <a 
            href="https://discord.gg/X2UW7VRqnB" 
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center bg-green-700 hover:bg-green-600 text-white px-10 py-4 rounded font-bold text-lg uppercase tracking-wider transition-transform hover:scale-105 shadow-[0_0_20px_rgba(21,128,61,0.4)]"
          >
            <MessageCircle className="mr-2" />
            HUBUNGI KAMI DI DISCORD
          </a>
        </div>
      </div>
    </div>
  );
};

export default Services;