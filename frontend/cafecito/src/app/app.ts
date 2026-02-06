
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <header class="toolbar">Cafecito Feliz POS</header>
    <main class="container">
      <router-outlet />
    </main>
  `,
  
styles: [`
  .toolbar {
    padding: 12px;
    background: var(--primary);
    color: #fff;
    font-weight: 600;
  }
  .container { padding: 16px; }
`]

})
export class AppComponent {}
