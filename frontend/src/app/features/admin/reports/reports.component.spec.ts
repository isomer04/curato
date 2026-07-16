import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminReportsComponent } from './reports.component';

describe('AdminReportsComponent', () => {
  let component: AdminReportsComponent;
  let fixture: ComponentFixture<AdminReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminReportsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Happy path
  it('AdminReportsComponent — default state — component creates successfully', () => {
    expect(component).toBeTruthy();
  });

  it('AdminReportsComponent — rendered — contains a root element in the DOM', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el).toBeTruthy();
  });

  // Edge cases
  it('AdminReportsComponent — multiple fixture detections — does not throw', () => {
    expect(() => {
      fixture.detectChanges();
      fixture.detectChanges();
    }).not.toThrow();
  });
});
