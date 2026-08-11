import React, { useState } from 'react';

export default function MultiModelConsole() {
  const [activeTab, setActiveTab] = useState('sql');

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-sans">
      <header className="px-6 py-4 border-b border-slate-800 bg-[#0F172A] flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-white">Multi-Model Studio</h1>
        <div className="flex bg-slate-900 rounded p-1 border border-slate-800 space-x-1">
          <button 
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-1.5 text-sm font-medium rounded ${activeTab === 'sql' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            SQL Workbench
          </button>
          <button 
            onClick={() => setActiveTab('doc')}
            className={`px-4 py-1.5 text-sm font-medium rounded ${activeTab === 'doc' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Document Explorer
          </button>
          <button 
            onClick={() => setActiveTab('vector')}
            className={`px-4 py-1.5 text-sm font-medium rounded ${activeTab === 'vector' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Vector Playground
          </button>
        </div>
      </header>

      <div className="flex-1 flex p-6 gap-6 max-w-[1600px] mx-auto w-full">
        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col bg-[#0F172A] border border-slate-800 rounded-lg overflow-hidden">
          <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
            <span className="text-xs font-mono text-slate-400">
              {activeTab === 'sql' ? 'query.sql' : activeTab === 'doc' ? 'query.json' : 'search.py'}
            </span>
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-xs font-medium transition-colors">
              Run Execute
            </button>
          </div>
          <div className="flex-1 p-4 font-mono text-sm text-indigo-300">
            {activeTab === 'sql' && (
              <textarea 
                className="w-full h-full bg-transparent resize-none focus:outline-none" 
                defaultValue="SELECT * FROM users&#10;WHERE active = true&#10;ORDER BY created_at DESC&#10;LIMIT 10;"
              />
            )}
            {activeTab === 'doc' && (
              <textarea 
                className="w-full h-full bg-transparent resize-none focus:outline-none" 
                defaultValue={'{\n  "find": {\n    "role": "admin",\n    "age": { "$gte": 21 }\n  }\n}'}
              />
            )}
            {activeTab === 'vector' && (
              <textarea 
                className="w-full h-full bg-transparent resize-none focus:outline-none" 
                defaultValue={'vector_search(\n  collection="docs",\n  query="machine learning infrastructure",\n  top_k=5\n)'}
              />
            )}
          </div>
        </div>

        {/* Results / Details Panel */}
        <div className="w-[400px] flex flex-col bg-[#0F172A] border border-slate-800 rounded-lg overflow-hidden">
          <div className="bg-slate-900 px-4 py-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Results</span>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            <div className="text-slate-500 text-sm italic">
              Results will appear here after execution...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
