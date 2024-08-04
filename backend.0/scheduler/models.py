from django.db import models


class Subject(models.Model):
    abbreviation = models.CharField(max_length=100)
    title = models.CharField(max_length=100)
    
    def __str__(self):
        return (f"{self.abbreviation}: {self.title}")


class Professor(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    rating = models.FloatField()
    difficulty_level = models.FloatField()
    would_take_again = models.FloatField()
    
    def __str__(self):
        return (f"{self.id}: {self.first_name} {self.last_name}")


class Section(models.Model):
    crn = models.IntegerField(primary_key=True)
    course = models.CharField(max_length=100)
    class_type = models.CharField(max_length=100)
    modality = models.CharField(max_length=100)
    credit_hours = models.IntegerField()
    capacity = models.IntegerField()
    professor = models.ForeignKey("Professor", on_delete=models.CASCADE)
    location = models.CharField(max_length=100)
    exam_code = models.CharField(max_length=100)
    
    def __str__(self):
        return (f"{self.crn}: {self.course}")

    
class SectionTime(models.Model):
    crn = models.ForeignKey("Section", on_delete=models.CASCADE)
    days = models.CharField(max_length=100)
    begin_time = models.TimeField()
    end_time = models.TimeField()
    
    def __str__(self):
        return (f"{self.crn}: {self.days} {self.begin_time} - {self.end_time}")


class User(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return (f"{self.id}: {self.first_name} {self.last_name}")


class Preference(models.Model):
    user = models.ForeignKey("User", on_delete=models.CASCADE)
    tod_preference = models.CharField(max_length=100)
    dow_preference = models.CharField(max_length=100)


class Weight(models.Model):
    user = models.ForeignKey("User", on_delete=models.CASCADE)
    tod_weight = models.FloatField()
    dow_weight = models.FloatField()
    prof_weight = models.FloatField()


class Schedule(models.Model):
    user = models.ForeignKey("User", on_delete=models.CASCADE)
    crns = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    score = models.FloatField()


class ScheduleLog(models.Model):
    user = models.ForeignKey("User", on_delete=models.CASCADE)
    crns = models.JSONField()
    score = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
