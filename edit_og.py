from PIL import Image, ImageDraw, ImageFont

def edit_image():
    img = Image.open("design/l14coordy.png")
    draw = ImageDraw.Draw(img)
    
    # Define a box that is wide enough to cover the old text 
    # and give room for the new background
    box = (380, 370, 748, 430)
    
    # Sample the background color just outside the box
    bg_color = img.getpixel((370, 400))
    
    # Fill the box with the background color
    draw.rectangle(box, fill=bg_color)
    
    # Load a serif font to match the original
    try:
        font = ImageFont.truetype("C:\\Windows\\Fonts\\georgia.ttf", 26)
    except IOError:
        font = ImageFont.load_default()
        
    text = "lfourteen-lfourteen.mycafe24.ai"
    
    # Get text bounding box to center it
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    # Center coordinates
    x = (img.width - text_w) / 2
    y = 398 - text_h / 2
    
    # Text color: sampled from original text visually. #9c7b5b roughly.
    text_color = (156, 123, 91)
    
    draw.text((x, y), text, fill=text_color, font=font)
    
    img.save("test.png")

if __name__ == "__main__":
    edit_image()
