import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { js2xml } from 'xml-js';

export const exportToExcel = (data, filename) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename + '.xlsx');
};

export const exportToCSV = (data, filename) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename + '.csv');
};

export const exportToPDF = (data, filename, columns) => {
  const doc = new jsPDF();
  doc.autoTable({ head: [columns], body: data.map(row => columns.map(col => row[col])) });
  doc.save(filename + '.pdf');
};

export const exportToXML = (data, filename) => {
  const xml = js2xml({ elements: [{ type: 'element', name: 'root', elements: data.map(row => ({ type: 'element', name: 'row', elements: Object.entries(row).map(([k, v]) => ({ type: 'element', name: k, elements: [{ type: 'text', text: String(v) }] })) })) }] }, { compact: false, spaces: 2 });
  const blob = new Blob([xml], { type: 'application/xml' });
  saveAs(blob, filename + '.xml');
};