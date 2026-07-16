import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminSettingsComponent } from './settings.component';

describe('AdminSettingsComponent', () => {
  let component: AdminSettingsComponent;
  let fixture: ComponentFixture<AdminSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSettingsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Happy path
  it('AdminSettingsComponent — default state — component creates successfully', () => {
    expect(component).toBeTruthy();
  });

  it('AdminSettingsComponent — rendered — contains a root element in the DOM', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el).toBeTruthy();
  });

  // Edge cases
  it('AdminSettingsComponent — multiple fixture detections — does not throw', () => {
    expect(() => {
      fixture.detectChanges();
      fixture.detectChanges();
    }).not.toThrow();
  });
});
