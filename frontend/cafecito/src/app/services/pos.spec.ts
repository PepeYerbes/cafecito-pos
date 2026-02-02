import { TestBed } from '@angular/core/testing';

import { Pos } from './pos';

describe('Pos', () => {
  let service: Pos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Pos);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
