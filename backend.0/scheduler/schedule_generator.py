import django
import os

# Setup Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'class_scheduler.settings')
django.setup()

from scheduler.models import Section, SectionTime
from itertools import combinations

def fetch_sections(courses):
    """
    Fetch all sections and their corresponding times for the given courses.
    
    Args:
        courses (list): A list of courses to fetch sections for.
        
    Returns:
        section_dict (dict): Dictionary mapping CRNs to Section objects.
        section_time_dict (dict): Dictionary mapping CRNs to lists of SectionTime objects.
    """
    # print(f"Fetching sections for courses: {courses}")
    
    # Fetch all sections and section times for the given courses
    sections = Section.objects.filter(course__in=courses)
    # print(f"Sections found: {list(sections)}")
    
    section_times = SectionTime.objects.filter(crn__in=[section.crn for section in sections])
    # print(f"Section times found: {list(section_times)}")
    
    # Map CRNs to Section objects
    section_dict = {section.crn: section for section in sections}
    # print(f"Section dictionary: {section_dict}")
    
    # Map CRNs to lists of SectionTime objects
    section_time_dict = {}
    for section_time in section_times:
        section = section_time.crn
        crn = section.crn
        
        if crn not in section_time_dict:
            section_time_dict[crn] = []
        
        section_time_dict[crn].append(section_time)
    
    # print(f"Section time dictionary: {section_time_dict}")
    
    return section_dict, section_time_dict

def check_conflict(section_times):
    """
    Check if any two SectionTime objects conflict within a list of SectionTime objects.
    
    Args:
        section_times (list): A list of SectionTime objects.
    
    Returns:
        bool: True if any conflict exists, False otherwise.
    """
    for i in range(len(section_times)):
        for j in range(i + 1, len(section_times)):
            time1 = section_times[i]
            time2 = section_times[j]
            
            # Check if they overlap on the same day
            if set(time1.days).intersection(set(time2.days)):
                if time1.end_time > time2.begin_time and time1.begin_time < time2.end_time:
                    # print(f"Conflict found between {time1} and {time2}")
                    return True
    return False


def is_valid_combination(section_times):
    """
    Determine if a combination of SectionTime objects has no conflicts.
    
    Args:
        section_times (list): A list of SectionTime objects.
        
    Returns:
        bool: True if the combination is valid (no conflicts), False otherwise.
    """
    # print(f"Checking validity of combination: {section_times}")
    
    # Use the updated check_conflict function
    if check_conflict(section_times):
        return False
    
    return True

def generate_valid_schedules(section_dict, section_time_dict, current_combination=[], valid_schedules=[], selected_courses=set()):
    """
    Recursively generate all valid schedules by checking for conflicts as the schedules are built.
    Ensure that each schedule contains all SectionTime objects for each section across all days.
    
    Args:
        section_dict (dict): Dictionary mapping CRNs to Section objects
        section_time_dict (dict): Dictionary mapping CRNs to lists of SectionTime objects
        current_combination (list): The current combination of SectionTime objects being considered
        valid_schedules (list): List to store valid schedules
        selected_courses (set): Set to track courses that have already been added to the current combination
    """
    # Base case: If all courses have been processed, check if the current combination is valid
    if len(selected_courses) == len(set(section.course for section in section_dict.values())):
        if is_valid_combination(current_combination):
            # print(f"Valid schedule found: {current_combination}")
            valid_schedules.append(current_combination)
        return

    # Get the first course that hasn't been selected yet
    remaining_courses = [section.course for crn, section in section_dict.items() if section.course not in selected_courses]
    
    if not remaining_courses:
        return
    
    # Process the next course
    next_course = remaining_courses[0]

    # Iterate over all sections of the next course
    for crn, section in section_dict.items():
        if section.course == next_course:
            # Get all SectionTime objects for the section
            section_times = section_time_dict[crn]
            
            # Consider the current combination with all SectionTime objects for this CRN added
            new_combination = current_combination + section_times
            
            # print(f"Considering section with times: {section_times}")
            generate_valid_schedules(
                section_dict,
                section_time_dict,
                new_combination,
                valid_schedules,
                selected_courses | {section.course}
            )


def get_valid_schedules(courses):
    """
    Main function to generate all valid schedules for the given list of courses.
    
    Args:
        courses (list): A list of course codes to generate schedules for
        
    Returns:
        List: List of valid schedules, where each schedule is a list of SectionTime objects
    """
    # print(f"Generating valid schedules for courses: {courses}")
    
    # Fetch sections and their times for the given courses
    section_dict, section_time_dict = fetch_sections(courses)
    
    # List to store valid schedules
    valid_schedules = []
    
    # Generate all valid schedules
    generate_valid_schedules(section_dict, section_time_dict, valid_schedules=valid_schedules)
    
    print(f"Total valid schedules: {len(valid_schedules)}")
    
    # print(f"Valid schedules: {valid_schedules}")
    
    return valid_schedules

# Test the function with debugging
courses = ["CS-1114", "MATH-1226", "CS-1014"]
valid_schedules = get_valid_schedules(courses)
print(valid_schedules)