package com.yahatravels.app

import android.app.Activity
import android.os.Bundle
import android.content.Intent
import android.net.Uri
import android.graphics.Color
import android.view.Gravity
import android.view.View
import android.widget.*

class MainActivity : Activity() {
    private val yellow = Color.rgb(255, 204, 0)
    private val black = Color.rgb(17, 17, 17)
    private lateinit var root: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        showHome()
    }

    private fun base(title: String) {
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(248, 248, 248))
            setPadding(22, 28, 22, 24)
        }
        val heading = TextView(this).apply {
            text = title
            textSize = 24f
            setTextColor(black)
            setBackgroundColor(yellow)
            gravity = Gravity.CENTER
            setPadding(12, 18, 12, 18)
        }
        root.addView(heading, LinearLayout.LayoutParams(-1, -2))
        setContentView(ScrollView(this).apply { addView(root) })
    }

    private fun button(label: String, action: () -> Unit) {
        val b = Button(this).apply {
            text = label
            setTextColor(black)
            setBackgroundColor(yellow)
            textSize = 16f
            setOnClickListener { action() }
        }
        root.addView(b, LinearLayout.LayoutParams(-1, -2).apply {
            topMargin = 12
        })
    }

    private fun showHome() {
        base("YAHA TOUR AND TRAVELS")
        text("Car aur Bike Booking • Jaunpur")
        text("Ertiga ₹14/KM  |  Dzire ₹12/KM")
        button("Customer - Book a Ride") { showBooking() }
        button("Driver Login") { showInfo("Driver Login", "Driver account login Firebase setup ke baad enable hoga.") }
        button("Admin Login") { showInfo("Admin Login", "Secure Admin login Firebase setup ke baad enable hoga.") }
        button("WhatsApp Contact") {
            val url = "https://wa.me/918874547741?text=" + Uri.encode("Namaste, mujhe YAHA TOUR AND TRAVELS se booking karni hai.")
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }
    }

    private fun text(value: String) {
        root.addView(TextView(this).apply {
            text = value
            textSize = 17f
            setTextColor(black)
            setPadding(4, 12, 4, 8)
        })
    }

    private fun field(hint: String): EditText {
        val e = EditText(this).apply {
            this.hint = hint
            textSize = 16f
            setSingleLine(true)
        }
        root.addView(e, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 8 })
        return e
    }

    private fun showBooking() {
        base("New Booking")
        val name = field("Customer name")
        val phone = field("Mobile number")
        val pickup = field("Pickup location")
        val drop = field("Drop location")
        val vehicle = Spinner(this)
        val options = listOf("Ertiga", "Dzire", "Bike")
        vehicle.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, options)
        root.addView(vehicle, LinearLayout.LayoutParams(-1, -2))
        val date = field("Travel date")
        button("Send Booking on WhatsApp") {
            if (name.text.isBlank() || phone.text.isBlank() || pickup.text.isBlank() || drop.text.isBlank()) {
                Toast.makeText(this, "Please fill name, phone, pickup and drop", Toast.LENGTH_LONG).show()
            } else {
                val message = "YAHA TOUR AND TRAVELS Booking%0AName: ${name.text}%0APhone: ${phone.text}%0AVehicle: ${vehicle.selectedItem}%0APickup: ${pickup.text}%0ADrop: ${drop.text}%0ADate: ${date.text}"
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/918874547741?text=" + Uri.encode(message))))
            }
        }
        button("Back") { showHome() }
    }

    private fun showInfo(title: String, message: String) {
        base(title)
        text(message)
        button("Back") { showHome() }
    }
}
