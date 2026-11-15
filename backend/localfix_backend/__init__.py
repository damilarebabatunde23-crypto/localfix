# LocalFix Backend Package
"""
Django Compatibility Patch for Python 3.14+:
In Python 3.14, `copy(super())` within `django.template.context.BaseContext.__copy__`
returns a `super` proxy object rather than a shallow copy of the context instance,
causing `AttributeError: 'super' object has no attribute 'dicts' and no __dict__ for setting new attributes`.

We patch `BaseContext.__copy__` at package initialization so that Django template
tag rendering (such as changelist_object_tools in Django Admin) works seamlessly.
"""

def _apply_python314_context_patch():
    try:
        from django.template import context

        def _patched_base_context_copy(self):
            cls = self.__class__
            duplicate = cls.__new__(cls)
            duplicate.__dict__.update(self.__dict__)
            duplicate.dicts = self.dicts[:]
            return duplicate

        context.BaseContext.__copy__ = _patched_base_context_copy
    except Exception:
        pass

_apply_python314_context_patch()
