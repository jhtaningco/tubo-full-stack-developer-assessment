from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Company, User


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'tax_id', 'email', 'created_at')
    search_fields = ('name', 'tax_id', 'email')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at')


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'company', 'is_active', 'is_staff', 'created_at')
    list_filter = ('is_active', 'is_staff', 'is_superuser')
    search_fields = ('email',)
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at')

    fieldsets = (
        (None, {'fields': ('id', 'email', 'password')}),
        ('Company', {'fields': ('company',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'created_at')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'company', 'is_active', 'is_staff'),
        }),
    )
    filter_horizontal = ('groups', 'user_permissions')
