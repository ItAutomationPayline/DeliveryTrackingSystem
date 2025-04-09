import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QcLeadComponent } from './qc-lead.component';

describe('QcLeadComponent', () => {
  let component: QcLeadComponent;
  let fixture: ComponentFixture<QcLeadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QcLeadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QcLeadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
