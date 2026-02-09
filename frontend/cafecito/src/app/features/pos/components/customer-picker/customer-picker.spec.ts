import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerPicker } from './customer-picker';

describe('CustomerPicker', () => {
  let component: CustomerPicker;
  let fixture: ComponentFixture<CustomerPicker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerPicker]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomerPicker);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
