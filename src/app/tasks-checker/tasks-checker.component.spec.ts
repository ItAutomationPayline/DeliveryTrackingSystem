import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TasksCheckerComponent } from './tasks-checker.component';

describe('TasksCheckerComponent', () => {
  let component: TasksCheckerComponent;
  let fixture: ComponentFixture<TasksCheckerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TasksCheckerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TasksCheckerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
