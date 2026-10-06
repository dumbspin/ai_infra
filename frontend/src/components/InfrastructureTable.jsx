import React from "react";
import { Container, RefreshCw } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export default function InfrastructureTable({ containers = [], onRefresh, isLoading }) {
  return (
    <Card className="rounded-3xl shadow-sm border-slate-200 overflow-hidden bg-white">
      {/* Table Header */}
      <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center text-green-700 shadow-sm">
            <Container className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Live Runtime Infrastructure</span>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-600 border-slate-200 font-mono">
                {containers.length} active units
              </Badge>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Real-time Docker Daemon Container State</p>
          </div>
        </div>

        <Button
          onClick={onRefresh}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="rounded-xl text-xs font-bold gap-1.5 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-orange-600" : "text-slate-500"}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto p-2 bg-white">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider bg-slate-50/80 font-bold">
              <th className="py-3 px-5">Resource Identifier</th>
              <th className="py-3 px-5">Image & Tag</th>
              <th className="py-3 px-5 text-center">Desired</th>
              <th className="py-3 px-5 text-center">Actual</th>
              <th className="py-3 px-5">Health State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {containers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400 font-sans">
                  No active containers detected. Run the synthesis pipeline to deploy infrastructure.
                </td>
              </tr>
            ) : (
              containers.map((c, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-5 font-black text-slate-900 flex items-center space-x-2 font-sans">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span>{c.resource}</span>
                  </td>
                  <td className="py-3.5 px-5 text-green-700 font-semibold">{c.image}</td>
                  <td className="py-3.5 px-5 text-center text-slate-500 font-bold">{c.desired}</td>
                  <td className="py-3.5 px-5 text-center text-green-700 font-black text-sm">{c.actual}</td>
                  <td className="py-3.5 px-5">
                    <Badge variant="success" className="gap-1 bg-green-50 text-green-700 border-green-200 font-extrabold text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span>{c.status}</span>
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}