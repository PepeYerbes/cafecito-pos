import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShiftHistory } from './shift-history';

describe('ShiftHistory', () => {
  let component: ShiftHistory;
  let fixture: ComponentFixture<ShiftHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShiftHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShiftHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
