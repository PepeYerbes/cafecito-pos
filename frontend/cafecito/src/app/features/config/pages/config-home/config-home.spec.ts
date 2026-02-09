import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigHome } from './config-home';

describe('ConfigHome', () => {
  let component: ConfigHome;
  let fixture: ComponentFixture<ConfigHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigHome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfigHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
