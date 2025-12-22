import api.data_access.models as models
from api.data_access.logic import Logic

# fish = models.Fish(
#     site_id="site_001",
#     date_created="2024-01-01T12:00:00",
#     date_modified="2024-01-01T12:00:00",
#     is_active=True,
#     user_id="user_001"
# ) 

# bl_logic = Logic()
# inserted_id = bl_logic.insert(fish)
# print(f"Inserted Fish with ID: {inserted_id}")

# fish.id =f"{inserted_id}"
# print(fish)

bl_logic = Logic()
data = bl_logic.get(models.Fish.__name__   )
print(data)
