import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QCComponent } from './qc.component';

describe('QCComponent', () => {
  let component: QCComponent;
  let fixture: ComponentFixture<QCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QCComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
