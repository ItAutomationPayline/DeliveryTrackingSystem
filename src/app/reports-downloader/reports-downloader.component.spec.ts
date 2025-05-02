import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsDownloaderComponent } from './reports-downloader.component';

describe('ReportsDownloaderComponent', () => {
  let component: ReportsDownloaderComponent;
  let fixture: ComponentFixture<ReportsDownloaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReportsDownloaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsDownloaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
