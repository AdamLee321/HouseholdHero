package ie.al.householdhero.widget

import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import ie.al.householdhero.R
import org.json.JSONObject

class ShoppingWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory =
        ShoppingWidgetFactory(applicationContext, intent)
}

class ShoppingWidgetFactory(
    private val context: Context,
    intent: Intent,
) : RemoteViewsService.RemoteViewsFactory {

    private data class Item(val id: String, val name: String, val checked: Boolean)

    private var items: List<Item> = emptyList()
    private var listId: String = ""
    private var familyId: String = ""

    override fun onCreate() {}

    override fun onDataSetChanged() {
        val prefs = context.getSharedPreferences(WidgetDataModule.PREFS_NAME, Context.MODE_PRIVATE)
        val jsonStr = prefs.getString(WidgetDataModule.KEY_DATA, null) ?: return
        try {
            val shopping = JSONObject(jsonStr).optJSONObject("shopping") ?: return
            listId = shopping.optString("listId", "")
            familyId = shopping.optString("familyId", "")
            val jsonItems = shopping.optJSONArray("items") ?: return
            items = (0 until jsonItems.length()).map { i ->
                val obj = jsonItems.getJSONObject(i)
                Item(obj.getString("id"), obj.getString("name"), obj.getBoolean("checked"))
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onDestroy() { items = emptyList() }

    override fun getCount(): Int = items.size
    override fun getViewTypeCount(): Int = 1
    override fun hasStableIds(): Boolean = true
    override fun getItemId(position: Int): Long = position.toLong()
    override fun getLoadingView(): RemoteViews? = null

    override fun getViewAt(position: Int): RemoteViews {
        val item = items.getOrNull(position)
            ?: return RemoteViews(context.packageName, R.layout.widget_shopping_list_item)

        val views = RemoteViews(context.packageName, R.layout.widget_shopping_list_item)
        views.setTextViewText(R.id.item_name, item.name)
        views.setFloat(R.id.item_name, "setAlpha", if (item.checked) 0.4f else 1.0f)
        views.setImageViewResource(
            R.id.item_check,
            if (item.checked) R.drawable.widget_check_on else R.drawable.widget_check_off,
        )

        // Fill-in intent carries the item-specific extras that merge with the template
        val fillIn = Intent().apply {
            putExtra(ShoppingWidgetProvider.EXTRA_ITEM_ID, item.id)
            putExtra(ShoppingWidgetProvider.EXTRA_CHECKED, item.checked)
            putExtra(ShoppingWidgetProvider.EXTRA_LIST_ID, listId)
            putExtra(ShoppingWidgetProvider.EXTRA_FAMILY_ID, familyId)
        }
        views.setOnClickFillInIntent(R.id.item_row, fillIn)
        return views
    }
}
