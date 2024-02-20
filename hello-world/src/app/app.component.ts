import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface PdfTextResponse {
  text: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'PDF Text Extractor';
  pdfUrl = ''; // The URL of the PDF to extract text from
  extractedText = ''; // The text extracted from the PDF

  constructor(private http: HttpClient) { }

  extractPdfText() {
    this.http.post<PdfTextResponse>('https://shiny-fortnight-jjr5jp7jjjvxhqvq4-3000.app.github.dev/extract-pdf-text', { url: this.pdfUrl })
      .subscribe(response => {
        this.extractedText = response.text;
      }, error => {
        console.error('Error extracting PDF text:', error);
      });
  }

}
