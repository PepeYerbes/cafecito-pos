import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CloseShift } from './close-shift';

describe('CloseShift', () => {
  let component: CloseShift;
  let fixture: ComponentFixture<CloseShift>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CloseShift]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CloseShift);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
