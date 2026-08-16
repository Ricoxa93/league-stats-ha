from dataclasses import dataclass
import sys
from types import ModuleType
from unittest.mock import AsyncMock

homeassistant = ModuleType("homeassistant")
components = ModuleType("homeassistant.components")
http = ModuleType("homeassistant.components.http")
setup = ModuleType("homeassistant.setup")


@dataclass
class StaticPathConfig:
    url_path: str
    path: str
    cache_headers: bool


http.StaticPathConfig = StaticPathConfig
setup.async_setup_component = AsyncMock(return_value=True)
sys.modules.setdefault("homeassistant", homeassistant)
sys.modules.setdefault("homeassistant.components", components)
sys.modules.setdefault("homeassistant.components.http", http)
sys.modules.setdefault("homeassistant.setup", setup)
