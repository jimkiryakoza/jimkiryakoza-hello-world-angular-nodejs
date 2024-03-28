import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface PdfTextResponse {
  text: string;
  searchResults: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'Patent Document Search';
  documentNumber = ''; // The URL of the PDF to extract text from
  searchString = ''; // The string to search for in the PDF
  extractedText = ''; // The text extracted from the PDF
  searchResults = '';

  constructor(private http: HttpClient) {}

  searchPdf() {
    this.http
      .post<PdfTextResponse>(
        'https://shiny-fortnight-jjr5jp7jjjvxhqvq4-3000.app.github.dev/search-pdf',
        { documentNumber: this.documentNumber, searchString: this.searchString }
      )
      .subscribe(
        (response) => {
          this.extractedText = response.text;
          this.searchResults = response.searchResults;
        },
        (error) => {
          console.error('Error extracting PDF text:', error);
        }
      );
  }
}
