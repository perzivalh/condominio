from pathlib import Path
path = Path('backend/api/finanzas/views.py')
text = path.read_text()
marker = 'def resumen_finanzas(request):'
idx = text.index(marker)
# Insert decorators before marker if not present
decorators = '@api_view(["GET"])\n@permission_classes([IsAuthenticated])\n'
if not text[:idx].rstrip().endswith(decorators.strip()):
    text = text[:idx] = text[:idx].rstrip('\n')
    before = text[:idx]
