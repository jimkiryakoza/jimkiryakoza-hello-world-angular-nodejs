import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface ConversionResponse {
  uppercaseText: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'hello-jim';
  inputText = ''; 
  uppercaseText = ''; 

  constructor(private http: HttpClient) {}

  convertToUppercase() {
    this.http.post<ConversionResponse>('https://shiny-fortnight-jjr5jp7jjjvxhqvq4-3000.app.github.dev/convert', { text: this.inputText })
        .subscribe(response => {
            this.uppercaseText = response.uppercaseText; // Now valid 
        });
  }
}
