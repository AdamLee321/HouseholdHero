package ie.al.householdhero.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import com.google.firebase.firestore.FirebaseFirestore
import ie.al.householdhero.MainActivity
import ie.al.householdhero.R
import org.json.JSONObject

class ChoresWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_TOGGLE = "ie.al.householdhero.CHORE_TOGGLE"
        const val EXTRA_CHORE_ID = "chore_id"
        const val EXTRA_STATUS = "status"
        const val EXTRA_FAMILY_ID = "family_id"

        private val ITEM_ROW_IDS = intArrayOf(
            R.id.chore_row_1, R.id.chore_row_2, R.id.chore_row_3,
            R.id.chore_row_4, R.id.chore_row_5
        )
        private val ITEM_NAME_IDS = intArrayOf(
            R.id.chore_name_1, R.id.chore_name_2, R.id.chore_name_3,
            R.id.chore_name_4, R.id.chore_name_5
        )
        private val ITEM_ROOM_IDS = intArrayOf(
            R.id.chore_room_1, R.id.chore_room_2, R.id.chore_room_3,
            R.id.chore_room_4, R.id.chore_room_5
        )
        private val ITEM_CHECK_IDS = intArrayOf(
            R.id.chore_check_1, R.id.chore_check_2, R.id.chore_check_3,
            R.id.chore_check_4, R.id.chore_check_5
        )
    }

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { updateWidget(context, manager, it) }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_TOGGLE) {
            val choreId = intent.getStringExtra(EXTRA_CHORE_ID) ?: return
            val currentStatus = intent.getStringExtra(EXTRA_STATUS) ?: return
            val familyId = intent.getStringExtra(EXTRA_FAMILY_ID) ?: return
            toggleChore(context, familyId, choreId, currentStatus)
        }
    }

    private fun toggleChore(
        context: Context,
        familyId: String,
        choreId: String,
        currentStatus: String
    ) {
        val newStatus = if (currentStatus == "done") "pending" else "done"
        val db = FirebaseFirestore.getInstance()

        db.collection("families").document(familyId)
            .collection("chores").document(choreId)
            .update("status", newStatus)

        // Optimistically update SharedPreferences so widget redraws immediately
        val prefs = context.getSharedPreferences(WidgetDataModule.PREFS_NAME, Context.MODE_PRIVATE)
        val jsonStr = prefs.getString(WidgetDataModule.KEY_DATA, null) ?: return
        try {
            val json = JSONObject(jsonStr)
            val chores = json.optJSONObject("chores") ?: return
            val items = chores.optJSONArray("items") ?: return
            var pendingCount = chores.optInt("pendingCount", 0)
            for (i in 0 until items.length()) {
                val item = items.getJSONObject(i)
                if (item.getString("id") == choreId) {
                    item.put("status", newStatus)
                    if (newStatus == "done") {
                        pendingCount = (pendingCount - 1).coerceAtLeast(0)
                    } else {
                        pendingCount += 1
                    }
                    break
                }
            }
            chores.put("pendingCount", pendingCount)
            prefs.edit().putString(WidgetDataModule.KEY_DATA, json.toString()).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Refresh all chores widget instances
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(
            android.content.ComponentName(context, ChoresWidgetProvider::class.java)
        )
        ids.forEach { updateWidget(context, manager, it) }
    }

    fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val options = manager.getAppWidgetOptions(widgetId)
        val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        val isMedium = minWidth >= 200

        val prefs = context.getSharedPreferences(WidgetDataModule.PREFS_NAME, Context.MODE_PRIVATE)
        val jsonStr = prefs.getString(WidgetDataModule.KEY_DATA, null)

        val views = if (isMedium) buildMediumView(context, jsonStr)
                    else buildSmallView(context, jsonStr)

        manager.updateAppWidget(widgetId, views)
    }

    // ── Small widget ────────────────────────────────────────────────────────

    private fun buildSmallView(context: Context, jsonStr: String?): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_chores_small)
        val openPi = openAppIntent(context, 0)
        views.setOnClickPendingIntent(R.id.widget_root, openPi)

        if (jsonStr == null) {
            views.setTextViewText(R.id.widget_title, "Chores")
            views.setTextViewText(R.id.widget_count, "Open app to start")
            return views
        }
        try {
            val chores = JSONObject(jsonStr).optJSONObject("chores")
            if (chores != null) {
                val pending = chores.optInt("pendingCount", 0)
                views.setTextViewText(R.id.widget_title, "Chores")
                views.setTextViewText(
                    R.id.widget_count,
                    if (pending == 0) "All done!" else "$pending chore${if (pending != 1) "s" else ""} left"
                )
            }
        } catch (e: Exception) {
            views.setTextViewText(R.id.widget_title, "Chores")
            views.setTextViewText(R.id.widget_count, "—")
        }
        return views
    }

    // ── Medium widget ───────────────────────────────────────────────────────

    private fun buildMediumView(context: Context, jsonStr: String?): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_chores_medium)

        views.setOnClickPendingIntent(R.id.widget_add_btn, openAppIntent(context, 99))

        if (jsonStr == null) {
            views.setTextViewText(R.id.widget_title, "Chores")
            views.setTextViewText(R.id.widget_footer, "Open app to get started")
            ITEM_ROW_IDS.forEach { views.setViewVisibility(it, View.GONE) }
            return views
        }

        try {
            val chores = JSONObject(jsonStr).optJSONObject("chores")
            if (chores == null) {
                views.setTextViewText(R.id.widget_title, "Chores")
                views.setTextViewText(R.id.widget_footer, "No chores yet")
                ITEM_ROW_IDS.forEach { views.setViewVisibility(it, View.GONE) }
                return views
            }

            val familyId = chores.optString("familyId", "")
            val pending = chores.optInt("pendingCount", 0)
            val items = chores.optJSONArray("items")
            val itemCount = items?.length() ?: 0

            views.setTextViewText(R.id.widget_title, "Today's Chores")
            views.setTextViewText(
                R.id.widget_footer,
                if (pending == 0 && itemCount > 0) "All done! ✓"
                else "$pending chore${if (pending != 1) "s" else ""} left"
            )

            for (i in 0 until 5) {
                if (items != null && i < itemCount) {
                    val item = items.getJSONObject(i)
                    val choreId = item.getString("id")
                    val choreName = item.getString("name")
                    val roomName = item.optString("roomName", "")
                    val status = item.optString("status", "pending")
                    val isDone = status == "done"

                    views.setViewVisibility(ITEM_ROW_IDS[i], View.VISIBLE)
                    views.setTextViewText(ITEM_NAME_IDS[i], choreName)
                    views.setTextViewText(ITEM_ROOM_IDS[i], roomName)
                    views.setFloat(ITEM_NAME_IDS[i], "setAlpha", if (isDone) 0.4f else 1.0f)
                    views.setFloat(ITEM_ROOM_IDS[i], "setAlpha", if (isDone) 0.4f else 0.6f)
                    views.setImageViewResource(
                        ITEM_CHECK_IDS[i],
                        if (isDone) R.drawable.widget_check_on else R.drawable.widget_check_off
                    )

                    val toggleIntent = Intent(context, ChoresWidgetProvider::class.java).apply {
                        action = ACTION_TOGGLE
                        data = Uri.parse("widget://chores/$choreId")
                        putExtra(EXTRA_CHORE_ID, choreId)
                        putExtra(EXTRA_STATUS, status)
                        putExtra(EXTRA_FAMILY_ID, familyId)
                    }
                    val togglePi = PendingIntent.getBroadcast(
                        context, 0, toggleIntent,
                        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                    )
                    views.setOnClickPendingIntent(ITEM_ROW_IDS[i], togglePi)
                } else {
                    views.setViewVisibility(ITEM_ROW_IDS[i], View.GONE)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            views.setTextViewText(R.id.widget_title, "Chores")
            ITEM_ROW_IDS.forEach { views.setViewVisibility(it, View.GONE) }
        }

        return views
    }

    private fun openAppIntent(context: Context, requestCode: Int): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("deepLink", "chores")
        }
        return PendingIntent.getActivity(
            context, requestCode, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }
}
