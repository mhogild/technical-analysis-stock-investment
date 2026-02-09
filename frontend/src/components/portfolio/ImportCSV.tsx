"use client";

import { useState, useRef } from "react";

interface ImportCSVProps {
  onFileSelected: (content: string) => void;
}

export default function ImportCSV({ onFileSelected }: ImportCSVProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileSelected(content);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div
      className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        dragOver
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <p className="text-sm text-gray-600 mb-2">
        Drag and drop a CSV file here, or
      </p>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
      >
        Browse files
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleChange}
      />
      <p className="mt-2 text-xs text-gray-400">
        CSV should have columns: Symbol, Quantity, Price, Date (optional), Currency (optional)
      </p>
    </div>
  );
}
