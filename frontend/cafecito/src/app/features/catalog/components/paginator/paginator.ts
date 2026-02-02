
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paginator.html',
  styleUrls: ['./paginator.css']
})
export class PaginatorComponent {
  @Input() page = 1;
  @Input() totalPages = 1;
  @Output() changePage = new EventEmitter<number>();

  prev() { if (this.page > 1) this.changePage.emit(this.page - 1); }
  next() { if (this.page < this.totalPages) this.changePage.emit(this.page + 1); }
  goto(p: number) { if (p >= 1 && p <= this.totalPages) this.changePage.emit(p); }

  pages(): number[] {
    const pages = [];
    for (let p = 1; p <= this.totalPages; p++) pages.push(p);
    return pages;
  }
}
