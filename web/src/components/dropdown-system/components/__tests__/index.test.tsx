import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AcademicYearsDropdown,
  ClassesDropdown,
  SectionsByClassDropdown,
  SubjectCategoriesDropdown,
  SubjectsDropdown,
  SubjectsByCategoryDropdown,
  TransportRoutesDropdown,
  HolidaysDropdown,
} from '../index';
import { DROPDOWN_ENDPOINTS } from '../../../../constants/dropdown/endpoints';

// Mock the InfiniteScrollDropdown component
jest.mock('../../../dropdown/InfiniteScrollDropdown', () => ({
  InfiniteScrollDropdown: jest.fn(({ endpoint, placeholder, dependsOn }) => (
    <div data-testid={`dropdown-${endpoint.key}`}>
      <div data-testid="endpoint-key">{endpoint.key}</div>
      <div data-testid="placeholder">{placeholder}</div>
      {dependsOn && <div data-testid="depends-on">{dependsOn}</div>}
    </div>
  )),
}));

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('Dropdown Components Integration', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('All dropdown components render correctly', () => {
    it('renders AcademicYearsDropdown with correct endpoint', () => {
      renderWithQueryClient(
        <AcademicYearsDropdown value="" onChange={mockOnChange} />
      );

      expect(screen.getByTestId(`dropdown-${DROPDOWN_ENDPOINTS.ACADEMIC_YEARS.key}`)).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-key')).toHaveTextContent(DROPDOWN_ENDPOINTS.ACADEMIC_YEARS.key);
    });

    it('renders ClassesDropdown with correct endpoint', () => {
      renderWithQueryClient(
        <ClassesDropdown value="" onChange={mockOnChange} />
      );

      expect(screen.getByTestId(`dropdown-${DROPDOWN_ENDPOINTS.CLASSES.key}`)).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-key')).toHaveTextContent(DROPDOWN_ENDPOINTS.CLASSES.key);
    });

    it('renders SectionsByClassDropdown with correct endpoint and dependency', () => {
      const classId = '10';
      renderWithQueryClient(
        <SectionsByClassDropdown classId={classId} value="" onChange={mockOnChange} />
      );

      expect(screen.getByTestId(`dropdown-${DROPDOWN_ENDPOINTS.SECTIONS_BY_CLASS.key}`)).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-key')).toHaveTextContent(DROPDOWN_ENDPOINTS.SECTIONS_BY_CLASS.key);
      expect(screen.getByTestId('depends-on')).toHaveTextContent(classId);
    });

    it('renders SubjectCategoriesDropdown with correct endpoint', () => {
      renderWithQueryClient(
        <SubjectCategoriesDropdown value="" onChange={mockOnChange} />
      );

      expect(screen.getByTestId(`dropdown-${DROPDOWN_ENDPOINTS.SUBJECT_CATEGORIES.key}`)).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-key')).toHaveTextContent(DROPDOWN_ENDPOINTS.SUBJECT_CATEGORIES.key);
    });

    it('renders SubjectsDropdown with correct endpoint', () => {
      renderWithQueryClient(
        <SubjectsDropdown value="" onChange={mockOnChange} />
      );

      expect(screen.getByTestId(`dropdown-${DROPDOWN_ENDPOINTS.SUBJECTS.key}`)).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-key')).toHaveTextContent(DROPDOWN_ENDPOINTS.SUBJECTS.key);
    });

    it('renders SubjectsByCategoryDropdown with correct endpoint and dependency', () => {
      const categoryId = 'science';
      renderWithQueryClient(
        <SubjectsByCategoryDropdown categoryId={categoryId} value="" onChange={mockOnChange} />
      );

      expect(screen.getByTestId(`dropdown-${DROPDOWN_ENDPOINTS.SUBJECTS_BY_CATEGORY.key}`)).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-key')).toHaveTextContent(DROPDOWN_ENDPOINTS.SUBJECTS_BY_CATEGORY.key);
      expect(screen.getByTestId('depends-on')).toHaveTextContent(categoryId);
    });

    it('renders TransportRoutesDropdown with correct endpoint', () => {
      renderWithQueryClient(
        <TransportRoutesDropdown value="" onChange={mockOnChange} />
      );

      expect(screen.getByTestId(`dropdown-${DROPDOWN_ENDPOINTS.TRANSPORT_ROUTES.key}`)).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-key')).toHaveTextContent(DROPDOWN_ENDPOINTS.TRANSPORT_ROUTES.key);
    });

    it('renders HolidaysDropdown with correct endpoint', () => {
      renderWithQueryClient(
        <HolidaysDropdown value="" onChange={mockOnChange} />
      );

      expect(screen.getByTestId(`dropdown-${DROPDOWN_ENDPOINTS.HOLIDAYS.key}`)).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-key')).toHaveTextContent(DROPDOWN_ENDPOINTS.HOLIDAYS.key);
    });
  });

  describe('Cascading dropdown behavior', () => {
    it('SectionsByClassDropdown depends on class selection', () => {
      const { rerender } = renderWithQueryClient(
        <SectionsByClassDropdown value="" onChange={mockOnChange} />
      );

      // Should not have depends-on when no classId
      expect(screen.queryByTestId('depends-on')).not.toBeInTheDocument();

      // Should have depends-on when classId is provided
      rerender(
        <QueryClientProvider client={createQueryClient()}>
          <SectionsByClassDropdown classId="10" value="" onChange={mockOnChange} />
        </QueryClientProvider>
      );

      expect(screen.getByTestId('depends-on')).toHaveTextContent('10');
    });

    it('SubjectsByCategoryDropdown depends on category selection', () => {
      const { rerender } = renderWithQueryClient(
        <SubjectsByCategoryDropdown value="" onChange={mockOnChange} />
      );

      // Should not have depends-on when no categoryId
      expect(screen.queryByTestId('depends-on')).not.toBeInTheDocument();

      // Should have depends-on when categoryId is provided
      rerender(
        <QueryClientProvider client={createQueryClient()}>
          <SubjectsByCategoryDropdown categoryId="science" value="" onChange={mockOnChange} />
        </QueryClientProvider>
      );

      expect(screen.getByTestId('depends-on')).toHaveTextContent('science');
    });
  });

  describe('Default placeholders', () => {
    const expectedPlaceholders = [
      { component: AcademicYearsDropdown, placeholder: 'Select Academic Year...' },
      { component: ClassesDropdown, placeholder: 'Select Class...' },
      { component: SectionsByClassDropdown, placeholder: 'Select Section...', props: { classId: '10' } },
      { component: SubjectCategoriesDropdown, placeholder: 'Select Subject Category...' },
      { component: SubjectsDropdown, placeholder: 'Select Subject...' },
      { component: SubjectsByCategoryDropdown, placeholder: 'Select Subject...', props: { categoryId: 'science' } },
      { component: TransportRoutesDropdown, placeholder: 'Select Transport Route...' },
      { component: HolidaysDropdown, placeholder: 'Select Holiday...' },
    ];

    expectedPlaceholders.forEach(({ component: Component, placeholder, props = {} }) => {
      it(`${Component.displayName} has correct default placeholder`, () => {
        renderWithQueryClient(
          <Component value="" onChange={mockOnChange} {...props} />
        );

        expect(screen.getByTestId('placeholder')).toHaveTextContent(placeholder);
      });
    });
  });

  describe('Component display names', () => {
    const components = [
      { component: AcademicYearsDropdown, name: 'AcademicYearsDropdown' },
      { component: ClassesDropdown, name: 'ClassesDropdown' },
      { component: SectionsByClassDropdown, name: 'SectionsByClassDropdown' },
      { component: SubjectCategoriesDropdown, name: 'SubjectCategoriesDropdown' },
      { component: SubjectsDropdown, name: 'SubjectsDropdown' },
      { component: SubjectsByCategoryDropdown, name: 'SubjectsByCategoryDropdown' },
      { component: TransportRoutesDropdown, name: 'TransportRoutesDropdown' },
      { component: HolidaysDropdown, name: 'HolidaysDropdown' },
    ];

    components.forEach(({ component, name }) => {
      it(`${name} has correct display name`, () => {
        expect(component.displayName).toBe(name);
      });
    });
  });
});