$(() => {
  $(this).scrollTop(0);
  const currentOrder = {};

  function ajaxCall(method, url, data, dataType) {
    return $.ajax({
      method,
      url,
      data,
      dataType,
    });
  }

  function dishTemplate(dish) {
    return `<section class='col-xs-12 col-sm-6 col-md-4'>
              <div class='dish' data-dishid='${dish.id}'>
                <div class='dish-img-wrapper'><img class='dish-img' src='${dish.img_url}'></div>
                <div class='caption'>
                  <h4 class='dish-name'>${dish.name}</h4>
                </div>              
                <div class='dish-details'>
                  <p class='dish-desc'>${dish.description}</p>
                  <p class='dish-price'>Price: $<span class='dishPrice'>${dish.price}</span></p>
                  <p class='dish-prep'>Prep Time: ${dish.preptime} mins (approx.)</p>
                </div>
                <div class='shop'>
                  <i class="fa fa-minus-square-o" aria-hidden="true"></i>
                  <span class='counter'>0</span>
                  <i class="fa fa-plus-square" aria-hidden="true"></i> 
                </div>
              </div>
            </section>`;
  }

  function cartTemplate(item) {
    return `<div class='dish' data-dishid='${item.id}'>
              <div class='caption'>
                <div class='dish-name'><i class="fa-li fa fa-remove"></i>${item.name}</div>
                <div class='dish-details'>
                  <span class='dish-price'>Price: $${item.price}</span>
                  <span class='counter'> X ${item.quantity}</span>
                </div>
              </div>              
            </div>`;
  }

  function checkoutTemplate(total) {
    if ($('.confirm-order').length) {
      return;
    }
    return `<form class='submit-payment' action='/orders/payment' method='POST'>
              <div class='submit-total'>Your total: $${total}</div>
                <div class='contact'>Contact info:</div>
                  <div class='form-name'>
                    <label for='name'>Name:</label>
                    <input class='form-control' id='name' type='text' name='name' placeholder='Name' required >
                  </div>
                  <div class='form-number'>
                    <label for='phone_number'>Phone Number:</label>
                    <input class='form-control' type='tel' min-length=10 id='phone_number' name='tel' pattern='[0-9,-]{10,12}' title='Please enter a valid phone number.' placeholder='555-555-5555' required >
                  </div>
                </div>
              <input class='btn btn-primary btn-lg btn-block pay-order' type='submit' role='button' value='Place Order'>
              </div>  
            </form>`;
  }

  function calculateTotal() {
    let total = 0;
    for (const prop in currentOrder) {
      const currObj = currentOrder[prop];
      total += currObj.price * currObj.quantity;
    }
    return total;
  }

  function paintPage(res) {
    $('.menu-wrapper').append(res.map(dishTemplate));

    $('.fa-minus-square-o').on('click', function () {
      const $that = $(this);
      const $counter = $that.siblings('.counter');
      const $menuContainer = $that.closest('[data-dishid]');
      const dishIDfromMenu = $menuContainer.data('dishid');
      const $cartContainer = $('.selected-dish');

      ajaxCall('PUT', '/orders')
        .then(() => {
          const $currentVal = 0 + $counter.text();
          if ($currentVal > 0) {
            const newVal = $currentVal - 1;
            $counter.text(newVal);
            const $dishInCart = $cartContainer.find(`[data-dishid="${dishIDfromMenu}"]`);
            const currentQuantity = (!$dishInCart) ? 0 : currentOrder[dishIDfromMenu].quantity;

            if (currentQuantity > 1) {
              $dishInCart.find('.counter').text(` X ${newVal}`);
            } else if (currentQuantity === 1) {
              $dishInCart.remove();
              delete currentOrder[dishIDfromMenu];
              $('#cart-total').text(calculateTotal());
            }
            currentOrder[dishIDfromMenu].quantity--;
            if ($('.selected-dish')[0].childElementCount === 0) {
              $('.place-order').addClass('disabled');
            }
          }
          $('#cart-total').text(calculateTotal());
        }, (err) => {
          console.error('we have a problem!!!');
        });
    });

    $('.fa-plus-square').on('click', function () {
      const $that = $(this);
      const $counter = $that.siblings('.counter');
      const $menuContainer = $that.closest('[data-dishid]');
      const dishIDfromMenu = $menuContainer.data('dishid');
      const dishName = $that.parent().siblings().children('.dish-name').text();
      const dishPrice = +$that.parent().siblings().find('.dishPrice').text();
      const $cartContainer = $('.selected-dish');

      $('.place-order').removeClass('disabled');
      
      ajaxCall('PUT', '/orders')
        .then(() => {
          const $currentVal = +$counter.text();
          const newVal = $currentVal + 1;
          $counter.text(newVal);
          const item = {
            id: dishIDfromMenu,
            name: dishName,
            price: dishPrice,
            quantity: newVal,
          };
          currentOrder[dishIDfromMenu] = item;

          const $dishInCart = $cartContainer.find(`[data-dishid="${dishIDfromMenu}"]`);
          if ($dishInCart.length) {
            $dishInCart.find('.counter').text(` X ${newVal}`);
          } else {
            $cartContainer.append(cartTemplate(item));
          }

          $('.fa-remove').on('click', function () {
            let idToDelete = $(this).closest('[data-dishid]').data('dishid');
            delete currentOrder[idToDelete];
            let $correspItemInMenu = $('.menu-wrapper').find(`[data-dishid="${ idToDelete }"]`);
            $correspItemInMenu.find('.counter').text('0');
            $(this).closest('.dish').remove();
            $('#cart-total').text(calculateTotal());
          });

          $('#cart-total').text(calculateTotal());
        }, (err) => {
          console.error('we have a problem!!!');
        });

      // remove all items in cart
      $('.clear-order').on('click', () => {
        $('.selected-dish').empty();
        Object.keys(currentOrder).forEach((prop) => {
          delete currentOrder[prop];
        });
        $counter.text('0');
        $('#cart-total').text(calculateTotal());
      });
    });
  }

  ajaxCall('GET', '/orders')
    .then(paintPage, (err) => {
      console.error(err);
    });

  $('.place-order').on('click', () => {
    if (Object.keys(currentOrder).length === 0) {
      $(this).attr('disabled', 'disabled');
      return;
    }
    const $cartContainer = $('.cart-wrapper');
    const currentTotal = calculateTotal();
    if (currentTotal !== 0) {
      $('.shop').fadeOut('400');
      ajaxCall('POST', '/orders/checkout', currentOrder);
      console.log('orders in cart:', currentOrder);
      $cartContainer.empty().append(checkoutTemplate(currentTotal));
    }
  });

  // NavBar transition effects
  $(window).on('scroll', () => {
    const header = $('header');
    const range = 200;
    const scrollTop = $(this).scrollTop();
    let offset = header.offset();
    const height = header.outerHeight();
    offset += height / 2;
    const calc = 1 - (scrollTop - offset + range) / range;

    header.css({
      opacity: calc,
    });

    if (calc > '1') {
      header.css({
        opacity: 1,
      });
    } else if (calc < '0') {
      header.css({
        opacity: 0,
      });
    }
  });

  // page scroll animation
  $('.btn-down').click(() => {
    $('html,body').animate({
      scrollTop: $('#menu').offset().top,
    }, 'slow');
  });

  // affix cart
  const $attribute = $('[data-smart-affix]');
  $attribute.each(function () {
    $(this).affix({
      offset: {
        top: $(this).offset().top + 70,
        right: $(this).offset().right,
      },
    });
  });

  $(window).on('resize', () => {
    $attribute.each(function () {
      $(this).data('bs.affix').options.offset = $(this).offset().top;
    });
  });
});
