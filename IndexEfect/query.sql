SELECT 
    vehicle_type, 
    payment_method, 
    COUNT(*) AS total_rides, 
    AVG(booking_value) AS avg_value,
    SUM(ride_distance) AS total_distance
FROM gold.dataset
WHERE 
    booking_status = 'Completed' 
    AND vehicle_type IN ('Uber XL', 'Premier Sedan', 'Go Sedan')
    AND booking_value > 300
    AND ride_distance BETWEEN 5 AND 50
GROUP BY vehicle_type, payment_method
ORDER BY total_distance DESC;