import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenShift } from './open-shift';

describe('OpenShift', () => {
  let component: OpenShift;
  let fixture: ComponentFixture<OpenShift>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpenShift]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpenShift);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
