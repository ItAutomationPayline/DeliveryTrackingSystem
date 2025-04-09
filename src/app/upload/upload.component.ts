import { Component } from '@angular/core';
import * as XLSX from 'xlsx';
@Component({
  selector: 'app-upload',
  standalone: false,
  
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css'
})
export class UploadComponent {
  tableData: any[][] = [];

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Read first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON array
        this.tableData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      };
      reader.readAsArrayBuffer(file);
    }
  }
}
