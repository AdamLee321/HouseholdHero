package ie.al.householdhero.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetDataModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "WidgetDataModule"

    companion object {
        const val PREFS_NAME = "HouseholdHeroWidgetPrefs"
        const val KEY_DATA = "widget_data"
    }

    @ReactMethod
    fun update(jsonData: String) {
        reactContext
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_DATA, jsonData)
            .apply()

        triggerRefresh(ShoppingWidgetProvider::class.java)
        triggerRefresh(ChoresWidgetProvider::class.java)
    }

    private fun triggerRefresh(providerClass: Class<*>) {
        val manager = AppWidgetManager.getInstance(reactContext)
        val ids = manager.getAppWidgetIds(ComponentName(reactContext, providerClass))
        if (ids.isNotEmpty()) {
            val intent = Intent(reactContext, providerClass).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            }
            reactContext.sendBroadcast(intent)
        }
    }
}
