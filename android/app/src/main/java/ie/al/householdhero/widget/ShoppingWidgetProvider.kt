package ie.al.householdhero.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import ie.al.householdhero.MainActivity
import ie.al.householdhero.R
import org.json.JSONObject

class ShoppingWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_TOGGLE = "ie.al.householdhero.SHOPPING_TOGGLE"
        const val EXTRA_ITEM_ID = "item_id"
        const val EXTRA_CHECKED = "checked"
        const val EXTRA_LIST_ID = "list_id"
        const val EXTRA_FAMILY_ID = "family_id"
    }

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { updateWidget(context, manager, it) }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_TOGGLE) {
            val itemId = intent.getStringExtra(EXTRA_ITEM_ID) ?: return
            val checked = intent.getBooleanExtra(EXTRA_CHECKED, false)
            val listId = intent.getStringExtra(EXTRA_LIST_ID) ?: return
            val familyId = intent.getStringExtra(EXTRA_FAMILY_ID) ?: return
            toggleItem(context, familyId, listId, itemId, checked)
        }
    }

    private fun toggleItem(
        context: Context,
        familyId: String,
        listId: String,
        itemId: String,
        currentChecked: Boolean,
    ) {
        val newChecked = !currentChecked
        val db = FirebaseFirestore.getInstance()

        db.collection("families").document(familyId)
            .collection("shoppingLists").document(listId)
            .collection("items").document(itemId)
            .update("checked", newChecked)

        val delta = if (currentChecked) 1L else -1L
        db.collection("families").document(familyId)
            .collection("shoppingLists").document(listId)
            .update("uncheckedCount", FieldValue.increment(delta))

        // Optimistically update SharedPreferences so widget redraws immediately
        val prefs = context.getSharedPreferences(WidgetDataModule.PREFS_NAME, Context.MODE_PRIVATE)
        val jsonStr = prefs.getString(WidgetDataModule.KEY_DATA, null) ?: return
        try {
            val json = JSONObject(jsonStr)
            val shopping = json.optJSONObject("shopping") ?: return
            val items = shopping.optJSONArray("items") ?: return
            for (i in 0 until items.length()) {
                val item = items.getJSONObject(i)
                if (item.getString("id") == itemId) {
                    item.put("checked", newChecked)
                    val newCount = (shopping.optInt("uncheckedCount", 0) + delta).coerceAtLeast(0)
                    shopping.put("uncheckedCount", newCount)
                    break
                }
            }
            prefs.edit().putString(WidgetDataModule.KEY_DATA, json.toString()).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }

        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(
            android.content.ComponentName(context, ShoppingWidgetProvider::class.java),
        )
        ids.forEach { updateWidget(context, manager, it) }
    }

    fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val options = manager.getAppWidgetOptions(widgetId)
        val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        val isMedium = minWidth >= 200

        val prefs = context.getSharedPreferences(WidgetDataModule.PREFS_NAME, Context.MODE_PRIVATE)
        val jsonStr = prefs.getString(WidgetDataModule.KEY_DATA, null)

        val views = if (isMedium) buildMediumView(context, jsonStr, widgetId)
                    else buildSmallView(context, jsonStr)

        manager.updateAppWidget(widgetId, views)
        if (isMedium) {
            manager.notifyAppWidgetViewDataChanged(widgetId, R.id.widget_list)
        }
    }

    // ── Small widget ────────────────────────────────────────────────────────

    private fun buildSmallView(context: Context, jsonStr: String?): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_shopping_small)
        val openPi = openAppIntent(context, 0)
        views.setOnClickPendingIntent(R.id.widget_root, openPi)

        if (jsonStr == null) {
            views.setTextViewText(R.id.widget_title, "Shopping")
            views.setTextViewText(R.id.widget_count, "Open app to start")
            return views
        }
        try {
            val shopping = JSONObject(jsonStr).optJSONObject("shopping")
            if (shopping != null) {
                val unchecked = shopping.optInt("uncheckedCount", 0)
                views.setTextViewText(R.id.widget_title, shopping.optString("listName", "Shopping"))
                views.setTextViewText(
                    R.id.widget_count,
                    if (unchecked == 0) "All done!" else "$unchecked item${if (unchecked != 1) "s" else ""} left",
                )
            }
        } catch (e: Exception) {
            views.setTextViewText(R.id.widget_title, "Shopping")
            views.setTextViewText(R.id.widget_count, "—")
        }
        return views
    }

    // ── Medium widget ───────────────────────────────────────────────────────

    private fun buildMediumView(context: Context, jsonStr: String?, widgetId: Int): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_shopping_medium)

        views.setOnClickPendingIntent(R.id.widget_add_btn, openAppIntent(context, 99))

        if (jsonStr == null) {
            views.setTextViewText(R.id.widget_title, "Shopping")
            views.setTextViewText(R.id.widget_footer, "Open app to get started")
            return views
        }

        try {
            val shopping = JSONObject(jsonStr).optJSONObject("shopping")
            if (shopping == null) {
                views.setTextViewText(R.id.widget_title, "Shopping")
                views.setTextViewText(R.id.widget_footer, "No lists yet")
                return views
            }

            val listName = shopping.optString("listName", "Shopping")
            val familyId = shopping.optString("familyId", "")
            val listId = shopping.optString("listId", "")
            val unchecked = shopping.optInt("uncheckedCount", 0)
            val itemCount = shopping.optJSONArray("items")?.length() ?: 0

            views.setTextViewText(R.id.widget_title, listName)
            views.setTextViewText(
                R.id.widget_footer,
                if (unchecked == 0 && itemCount > 0) "All done! ✓"
                else "$unchecked item${if (unchecked != 1) "s" else ""} left",
            )

            // Attach the scrollable list adapter
            val serviceIntent = Intent(context, ShoppingWidgetService::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
            }
            views.setRemoteAdapter(R.id.widget_list, serviceIntent)

            // Template PendingIntent — item-specific extras are filled in by the factory
            val toggleTemplate = Intent(context, ShoppingWidgetProvider::class.java).apply {
                action = ACTION_TOGGLE
            }
            val togglePi = PendingIntent.getBroadcast(
                context, widgetId, toggleTemplate,
                PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
            views.setPendingIntentTemplate(R.id.widget_list, togglePi)

        } catch (e: Exception) {
            e.printStackTrace()
            views.setTextViewText(R.id.widget_title, "Shopping")
        }

        return views
    }

    private fun openAppIntent(context: Context, requestCode: Int): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("deepLink", "shopping")
        }
        return PendingIntent.getActivity(
            context, requestCode, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
    }
}
