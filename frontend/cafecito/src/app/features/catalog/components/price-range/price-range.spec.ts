import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PriceRange } from './price-range';

describe('PriceRange', () => {
  let component: PriceRange;
  let fixture: ComponentFixture<PriceRange>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriceRange]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PriceRange);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
